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

## Telemetry of workload containers

The tool a pipeline runs — a test suite, stroppy, a benchmark — speaks
OpenTelemetry but knows neither the server nor a token. The executor of the
machine role opens a local OTLP intake: one plaintext port on the loopback and
on the docker bridge, taking gRPC and HTTP alike. The docker library puts its
address into every container's `OTEL_EXPORTER_OTLP_ENDPOINT` (a user-set
endpoint wins). The intake overwrites the correlation attributes —
`graphene.namespace`, `graphene.run`, `graphene.agent`, `graphene.role=workload`
— on every resource and forwards to the server under the executor's own
credential, the path the executor's own telemetry takes. A workload cannot
claim another run or namespace: whatever it wrote there is replaced. Its
signals then answer to the run's `ref+query` like the executor's do, and
`graphene.role` tells them apart.

## A record's signals are its own

A ref is a name, and names are reused: run after run declares `agent/db-1` or
`docker/pg`. Each declaration is a new record, and the previous bearer of the
name is not its past. Dimensions 3–5 are therefore bounded by the record's
birth — the start of the first run of its workflow chain, so a long-lived
record that has continued-as-new keeps its whole history. Logs, metrics and
traces older than the record are not shown as its own, in `graphenectl`, in
`run watch`, and in Studio alike.

The bound carries a few seconds of slack: a signal's timestamp is set on the
machine that emitted it, the record's birth on the server. When the birth
cannot be established — the first run is past the namespace's retention — no
bound is applied: showing too much is better than hiding a long-lived record's
own history. A run's id is unique, so a run needs no bound.

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
