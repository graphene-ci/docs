---
sidebar_position: 3
title: Первый локальный план
sidebar_label: Первый локальный план
---

# Первый локальный план

Для первого честного знакомства не нужны сервер и облачные credentials.
Постройте план выполнения из компилируемого полного примера:

```console
$ git clone https://github.com/graphene-ci/examples.git
$ cd examples/full
$ go run . plan
```

Команда выполняет recording pass пайплайна и печатает:

- ручную, cron- и webhook-точки входа;
- политику конкурентности;
- дерево владения ресурсами;
- объявленные действия, выборки, чужие attachments и передачи.

Инфраструктура не создаётся. Ветви, зависящие от runtime-значений, в этом
оптимистичном проходе не видны — вывод сообщает об этом явно. `plan -o json`
даёт машиночитаемый результат, `plan -o mermaid` — диаграмму.

Сам пример показывает реальную текущую поверхность: типизированные параметры,
Crossplane-объекты через Kubernetes-библиотеку, существующую машину и агент на
облачной VM, Docker-ресурсы, cron- и webhook-триггеры, межпайплайновые
артефакты, передачу владения, data-flow edges и сбор телеметрии.

## Dev-инсталляция

Репозиторий сервера содержит полную среду разработки:

```console
$ git clone https://github.com/graphene-ci/graphene.git
$ cd graphene
$ make configure
$ make compose-up
$ go build -o bin/graphenectl ./cmd/graphenectl
$ printf '%s\n' dev-admin-token | \
    bin/graphenectl login --server 127.0.0.1:7233 --token-stdin --insecure
$ bin/graphenectl get pipeline
```

Compose поднимает Temporal development server, объектное хранилище, container
registry и backends метрик, логов и трейсов. Это не production deployment: он
публикует dev-credentials, использует plaintext transport и перед настоящим
запуском требует заменить `GRAPHENE_SERVER_EXTERNAL` адресом, доступным
удалённым агентам и worker containers.

Полный ран также требует внешние системы, названные примером. Минимальному
примеру нужна существующая машина, доступная по SSH; полному — Kubernetes
cluster с Crossplane и Yandex Cloud provider. Их исходники служат исполняемой
документацией; начинайте с меньшего контура.

Состав сервисов, хранение данных, адрес удалённых агентов и граница
безопасности описаны в разделе
[Development-инсталляция](../operations/development-installation.md).
