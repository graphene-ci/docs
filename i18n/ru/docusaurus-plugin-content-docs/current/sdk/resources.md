---
sidebar_position: 3
title: Ресурсы и агенты
sidebar_label: Ресурсы и агенты
---

# Ресурсы и агенты

Объявление ресурса возвращает хэндл; выходы доступны только через
`Ready`. Механика — запись, фазы, дерево владения — в
[Концепциях](../concepts/resources.md); эта страница — кодовая
поверхность.

## Объявление агентов

```go
// Запись ждёт подключения агента (свежая VM приносит его
// через user-data).
vmAgent := pipeline.NewAgent(ctx, "edge-1",
	pipeline.WithLabels(map[string]string{"role": "edge"}))

// Машина уже существует: единственное касание системы — установка
// по ssh. Ключ — ИМЯ секрета; host key обязателен: control plane,
// открывающий root-шелл, не работает по trust-on-first-use.
bareAgent := pipeline.NewAgentViaSSH(ctx, "bare-1", pipeline.SSHInstall{
	Address: params.BareHost,
	User:    params.BareUser,
	KeyRef:  pipeline.Secret(ctx, "bare-ssh-key"),
	HostKey: params.BareHostKey,
}, pipeline.WithLabels(map[string]string{"role": "edge"}))
```

`vmAgent.CloudInit()` отдаёт identity для user-data свежей VM — так
агент попадает на машину, которую пайплайн вот-вот создаст:

```go
vm := k8slib.Resource(ctx, k8sClient, &compute.Instance{
	...
	Metadata: map[string]*string{"user-data": ptr(vmAgent.CloudInit())},
}, k8slib.WithResourceOption[compute.Instance](pipeline.Children(vmAgent)))
```

## Опции объявления

| Опция | Смысл |
|---|---|
| `Parent(h)` | ресурс умирает вместе с `h`, а не с раном |
| `Children(h...)` | ресурс забирает во владение уже существующие |
| `WithLabels(m)` | метки записи — выборка по равенству |
| `Need(name, WhereLabel(k,v), WhereIn(k, v...))` | требование возможности; готовность его ждёт |

## Выборка

```go
edges, err := pipeline.SelectAgents(ctx,
	pipeline.WithLabels(map[string]string{"role": "edge"}),
	pipeline.Need("docker"))
```

Снапшот подходящих агентов; выборка — чужая: владение не берётся.

## Чужие ресурсы

```go
foreign := pipeline.AttachAgent(ctx, "edge-1", pipeline.Need("marker"))
baseline := pipeline.AttachArtifact(ctx, "baseline-report")
```

Присоединённые читаются как свои; не могут быть родителем или
ребёнком.

## Пережить свой ран

Долгая жизнь — передача, не sleep: стенд пайплайна существует всегда:

```go
pipeline.ToStand(ctx, vm, pipeline.KeepFor(params.Keep)) // срок ограничивает пребывание
pipeline.ToStand(ctx, reportArtifact)                    // живёт до явного удаления
```

Workflow возвращается сразу; машина остаётся жить.
