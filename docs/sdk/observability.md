---
sidebar_position: 7
title: Emit telemetry
sidebar_label: Emit telemetry
---

# Emit telemetry

`pipeline.Main` installs OpenTelemetry and Temporal instrumentation. User code
adds domain information through `pkg/obs`; it does not configure exporters.

## Logs

```go
obs.Info(ctx, "package installed", obs.Str("name", pkg), obs.Int("attempt", n))
obs.Warn(ctx, "retrying", obs.Err(err))
```

Available levels are `Debug`, `Info`, `Warn`, and `Error`. Attributes use
`Str`, `Int`, and `Err`. The worker automatically adds run, pipeline, activity,
and entity correlation.

`obs.RunTail(ctx, cmd, bytes)` streams stdout/stderr while retaining a bounded
tail for the returned error. Prefer it around external commands so the failure
reason reaches the record's logs.

## Metrics and spans

```go
obs.Count(ctx, "packages.installed", 1, obs.Str("manager", "dnf"))
obs.Gauge(ctx, "queue.depth", depth)
obs.Measure(ctx, "download.seconds", elapsed)

ctx, span := obs.Span(ctx, "download", obs.Str("source", source))
defer span.End()
```

`Count` is an integer counter increment, `Gauge` records a value, and
`Measure` records a floating-point measurement. Names should describe stable
product signals rather than Go functions.

## Durable events

```go
err := obs.EventFor(ctx, "docker/db", "schema-migrated", payload)
```

An event is a durable domain milestone in the record's workflow history, not a
log line. Use it sparingly: each event consumes history. In a resource activity,
`obs.Event` uses the entity already attached to the context; use `EventFor`
when acting on another record explicitly.

Read all dimensions through [graphenectl observe](../graphenectl/observe.md) or
[Studio](../studio/runs-resources.md). Backend wiring belongs to
[server configuration](../operations/server-configuration.md#telemetry).
