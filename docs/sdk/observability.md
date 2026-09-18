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
reason reaches the record's logs. Concurrent stdout and stderr writes share a
synchronized tail buffer; their cross-stream ordering is not guaranteed.

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

Metric exports use OTLP requests of at most 2 MiB before compression. Large
collections are split at resource, scope, instrument or data-point boundaries;
each complete point retains its attributes, timestamps, histogram buckets and
exemplars. Every request retains authentication and resource identity. Receiver
partial rejections remain visible as export errors. A single point with metadata
that exceeds the limit fails explicitly; points are not truncated. The exporter
retains its 64 MiB total-collection guard and existing retry policy.

## Log delivery

Log records never block the code that logs: they pass through a bounded queue
and leave in batches. Three bounds keep that honest.

- **A record's body is at most 16 KiB.** A longer message is cut and says by
  how much (`…[+N bytes]`). Code that streams output — `obs.RunTail`,
  `dockerlib.Job` — cuts long lines into records itself, so nothing is dropped
  there.
- **An export request is at most 2 MiB**, split at record boundaries in order,
  exactly like metric requests. A batch of long lines is far larger than the
  door's 4 MiB gRPC limit, and a rejected request would lose the whole batch.
- **The queue holds 8192 records and exports 4096 at a time.** The sustained
  ceiling is batch size over export latency — about 200k lines/s at a 20 ms
  round trip. Output faster than that overwrites the oldest queued records:
  a slow door must not stall an activity.

Loss is never silent. Every process counts what it handed to the queue and what
the door accepted — `graphene.obs.log.emitted` and `graphene.obs.log.exported`
in the run's metrics; a gap that keeps growing is loss in progress. At shutdown,
after the final flush, the exact number becomes the process's last log record
(`obs: N log records were lost — …`), a line on stderr, and the counter
`graphene.obs.log.lost`. When nothing was lost, none of the three appears.

The complete output of a job is always in its log file on the machine
(`JobReport.LogPath`) — keep it as an artifact when the logs matter.

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
