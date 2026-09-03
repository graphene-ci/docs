---
sidebar_position: 7
title: Data flows and topology
sidebar_label: Data flows
---

# Data flows and topology

Ownership answers **who is responsible for a resource and its death**. A flow
answers the independent question **who talks to whom and how**. A dependency
between services must not be faked as ownership just to draw a graph.

A resource declares its outgoing edge:

```go
pgExporter := dockerlib.Container(ctx, agent, exporterSpec,
    pipeline.WithFlowTo(pg, pipeline.TCP, "postgres", pipeline.FlowPort(5432)),
)
```

`WithFlowTo` targets another resource handle. `WithFlow` may target an external
endpoint string. Known protocols are `TCP`, `HTTP`, `GRPC`, `PrometheusPull`,
`RemoteWrite`, and `OTLP`; the protocol value is open, so a library can name a
more specific one. The port is structured data and the label remains a human
description.

Flows are **declared intent**, not verified network traffic. They live in the
record state, survive after the run when the resource is transferred to a
stand, and let Studio render the current topology. System-created virtual edges
also expose how an agent carries commands, TTY sessions, and telemetry through
the server.

Do not confuse resource flows with cross-pipeline control and data contracts:
an upstream trigger starts another pipeline; an artifact transfers durable
bytes. Both may be shown beside the resource topology, but they have their own
lifecycle semantics.
