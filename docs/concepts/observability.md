---
sidebar_position: 6
title: Observability
sidebar_label: Observability
---

# Observability

Every record is observed as one subject through five dimensions:

1. **state** — the current spec, lifecycle phase, owner, labels, timestamps,
   and kind-specific state;
2. **events** — the record's durable history, including commands and activity
   transitions;
3. **logs** — structured telemetry attributed to the record;
4. **metrics** — its metric series and samples;
5. **trace** — spans covering the workflow and activities that act for it.

The dimensions belong to the record, not to a particular runner or backend.
The same commands therefore work for a run, agent, artifact, Docker container,
Kubernetes object, source, or system record:

```console
$ graphenectl get docker/pg-exporter
$ graphenectl events docker/pg-exporter
$ graphenectl docker/pg-exporter logs -f
$ graphenectl docker/pg-exporter metrics -f
$ graphenectl docker/pg-exporter trace -f
```

## Attribution

Pipeline and server worker interceptors attach the record reference and its run,
agent, namespace, and contour context to emitted telemetry. Agent observation
beats carry host-command output and optional Prometheus scrape samples for a
resource on the machine. This makes library resources observable without each
library inventing a transport.

## History and live follow

Events come from durable workflow history. Logs, metrics, and traces first read
a snapshot from their configured backend and then, with `-f`, continue from the
server's live OTLP fan-out. Slow consumers receive explicit dropped-signal
accounting rather than a silent claim of completeness.

The development stack uses VictoriaLogs, VictoriaMetrics, and VictoriaTraces.
These are adapters behind standard LogsQL, PromQL, Jaeger, and OTLP surfaces;
they are not part of the Graphene record model.

See [`graphenectl` observing](../graphenectl/observe.md) for command forms and
raw backend queries.
