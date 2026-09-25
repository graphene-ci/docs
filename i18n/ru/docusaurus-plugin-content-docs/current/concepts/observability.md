---
sidebar_position: 6
title: Наблюдаемость
sidebar_label: Наблюдаемость
---

# Наблюдаемость

Каждая запись наблюдается как один субъект в пяти измерениях:

1. **state** — текущие spec, lifecycle phase, owner, labels, timestamps и
   состояние конкретного kind;
2. **events** — durable history записи, включая commands и переходы activities;
3. **logs** — структурированная телеметрия, отнесённая к записи;
4. **metrics** — её metric series и samples;
5. **trace** — spans workflow и activities, действующих от её имени.

Измерения принадлежат записи, а не конкретному runner или backend. Поэтому одни
команды работают для рана, агента, артефакта, Docker container, Kubernetes
object, source и системной записи:

```console
$ graphenectl get docker/pg-exporter
$ graphenectl events docker/pg-exporter
$ graphenectl docker/pg-exporter logs -f
$ graphenectl docker/pg-exporter metrics -f
$ graphenectl docker/pg-exporter trace -f
```

## Атрибуция

Interceptors pipeline- и server-workers добавляют к телеметрии ref записи и
контекст её run, agent, namespace и contour. Observation beats агента переносят
вывод host commands и необязательные Prometheus scrape samples ресурса на
машине. Поэтому библиотечные ресурсы наблюдаемы без собственного transport в
каждой библиотеке.

## Телеметрия рабочих контейнеров

Инструмент, который запускает пайплайн — тестовый набор, stroppy, бенчмарк —
говорит на OpenTelemetry, но не знает ни сервера, ни токена. Исполнитель роли
machine открывает локальный OTLP-приёмник: один открытый порт на loopback и на
docker bridge, принимающий и gRPC, и HTTP. Библиотека docker кладёт его адрес в
`OTEL_EXPORTER_OTLP_ENDPOINT` каждого контейнера (endpoint, заданный
пользователем, важнее). Приёмник перезаписывает корреляционные атрибуты —
`graphene.namespace`, `graphene.run`, `graphene.agent`,
`graphene.role=workload` — на каждом ресурсе и пересылает на сервер под
собственной учёткой исполнителя, тем же путём, что и его собственная
телеметрия. Рабочая нагрузка не может назваться чужим раном или namespace: что
бы она туда ни записала, оно заменяется. Дальше её сигналы отвечают на
`ref+query` рана так же, как сигналы исполнителя, а `graphene.role` их
различает.

## История и live follow

Events читаются из durable workflow history. Logs, metrics и traces сначала
получают snapshot из настроенного backend, а с `-f` продолжаются из live OTLP
fan-out сервера. Для медленных потребителей потерянные signals считаются явно,
а не скрываются за ложным обещанием полноты.

Dev-стек использует VictoriaLogs, VictoriaMetrics и VictoriaTraces. Это адаптеры
за стандартными LogsQL, PromQL, Jaeger и OTLP surfaces, а не часть record model
Graphene.

Формы команд и raw backend queries описаны в разделе
[Наблюдение в `graphenectl`](../graphenectl/observe.md).
