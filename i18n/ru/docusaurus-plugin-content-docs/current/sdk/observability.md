---
sidebar_position: 7
title: Отправка телеметрии
sidebar_label: Отправка телеметрии
---

# Отправка телеметрии

`pipeline.Main` устанавливает OpenTelemetry и Temporal instrumentation. Код
пользователя добавляет доменную информацию через `pkg/obs`, но не настраивает
exporters.

## Логи

```go
obs.Info(ctx, "package installed", obs.Str("name", pkg), obs.Int("attempt", n))
obs.Warn(ctx, "retrying", obs.Err(err))
```

Доступны `Debug`, `Info`, `Warn` и `Error`. Атрибуты создают `Str`, `Int` и
`Err`. Worker автоматически добавляет корреляцию run, pipeline, activity и
entity.

`obs.RunTail(ctx, cmd, bytes)` стримит stdout/stderr и сохраняет ограниченный
хвост для возвращаемой ошибки. Используйте его вокруг внешних команд, чтобы
причина сбоя дошла до логов записи.

## Метрики и spans

```go
obs.Count(ctx, "packages.installed", 1, obs.Str("manager", "dnf"))
obs.Gauge(ctx, "queue.depth", depth)
obs.Measure(ctx, "download.seconds", elapsed)

ctx, span := obs.Span(ctx, "download", obs.Str("source", source))
defer span.End()
```

`Count` добавляет к целочисленному counter, `Gauge` записывает значение,
`Measure` — вещественное измерение. Имена должны описывать стабильные сигналы
продукта, а не функции Go.

## Durable events

```go
err := obs.EventFor(ctx, "docker/db", "schema-migrated", payload)
```

Event — durable доменная веха в workflow history записи, а не строка лога.
Используйте события редко: каждое занимает history. В activity ресурса
`obs.Event` берёт entity из контекста; при явной работе с другой записью нужен
`EventFor`.

Все измерения читаются через [graphenectl observe](../graphenectl/observe.md)
или [Studio](../studio/runs-resources.md). Бекенды настраиваются в
[конфигурации сервера](../operations/server-configuration.md#телеметрия).
