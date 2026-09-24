---
sidebar_position: 5
title: Kubernetes и Crossplane
sidebar_label: Kubernetes
---

# Kubernetes и Crossplane

Kubernetes-библиотека превращает любой зарегистрированный Go API type в ресурс
Graphene: initialize делает apply и ждёт, reconcile лечит drift, finalize
удаляет. Ресурсы Crossplane используют тот же механизм; provider и credentials
принадлежат кластеру пользователя.

## Client и типы

```go
client := k8slib.NewClientFromSecret(
    pipeline.Secret(ctx, "kubeconfig"),
    k8slib.WithScheme(providerapis.AddToScheme),
)
```

Kubeconfig разрешается из секрета только внутри run worker. Встроенные
Kubernetes-типы зарегистрированы по умолчанию; `WithScheme` добавляет CRD из
их нативных Go-пакетов.

## Декларация ресурса

```go
network := k8slib.Resource(ctx, client, "net", &vpc.Network{
    Spec: vpc.NetworkSpec{ForProvider: vpc.NetworkParameters{
        FolderID: &params.FolderId,
    }},
},
    k8slib.WithReady(func(live *vpc.Network) bool {
        return live.Status.GetCondition(xpv1.TypeReady).Status == corev1.ConditionTrue
    }),
    k8slib.WithTimeout[vpc.Network](30*time.Minute),
    k8slib.WithResourceOption[vpc.Network](pipeline.WithLabels(labels)),
)
```

Аргумент `name` становится и id записи, и `metadata.name`; конфликтующее имя в
object отклоняется. `Ready` возвращает живой типизированный object вместе со
status, который записал кластер или provider.

## Опции

| Опция | По умолчанию | Контракт |
|---|---|---|
| `WithReady(fn)` | соглашение kstatus/Ready condition | определить готовность по live object |
| `WithDrifted(fn)` | drift только при исчезновении | решить, нужен ли повторный apply desired state |
| `WithValidate(fn)` | нет | отклонить desired state до activity |
| `WithReconcileEvery(d)` | 30s | период проверки drift |
| `WithPollInterval(d)` | 5s | период опроса readiness |
| `WithTimeout(d)` | 20m | предел ожидания convergence |
| `WithResourceOption(...)` | владелец run | parent, children, labels и flows |

Первая декларация Go kind фиксирует handlers этого worker. Для следующих
экземпляров используйте те же опции.

Сразу после apply у managed resources Crossplane часто нет conditions;
задавайте `WithReady` по реальному сигналу provider. Для связей Kubernetes
objects предпочитайте нативные reference fields: кластер разрешит их без
переноса сгенерированных ids через workflow history.

Сейчас проект имеет unit coverage библиотеки, но не поставляет conformance
suite с живым kind-кластером. Поведение provider должно быть частью тестируемого
контракта вашего пайплайна.

## Локальные тесты

Моделирование зависимостей и проверка пайплайна описаны в
[руководстве по локальным тестам](../sdk/testing.md).

## Кластер инсталляции

`k8slib.NewClientInCluster(opts...)` явно выбирает projected-реквизиты
ServiceAccount воркера. Оператор задаёт `serviceAccountName` и RBAC через
`managed.pod_template` инсталляции. Эта учётка предназначена только для
доверенных пайплайнов. Ошибочные реквизиты `NewClientFromSecret` никогда
не переключают клиента на учётку инсталляции. Выбор подключения сохраняется
для reconcile и удаления, включая удаление после неудачного создания.

Для конфигурации с внешним владельцем и явным жизненным циклом activity может
вызвать `client.ObjectClient(ctx, object)` и получить нативный Kubernetes API
ресурса. Этот вызов не создаёт Graphene entity и не обеспечивает автоматический
cleanup. Для ресурсов прогона используйте `Resource`. Секреты разрешаются внутри
activity; их значения нельзя включать во входы workflow, результаты и логи.
