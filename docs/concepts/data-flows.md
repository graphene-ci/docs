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

The door mirrors a record's flows into visibility (the `EntityFlows` search
attribute, one keyword per edge) together with its owner, so every row of a
listing or a tree carries `flows` — for a live record and for a deleted one
alike. The topology of a finished run is read from `graphenectl tree run/<id>
--flows` or one `Tree` call, although the state of its deleted records is gone
with their worker. The mirror is bounded by Temporal's 2 KiB per attribute:
some 25–50 edges on one record; a record with more keeps them all in its
state and shows none in the mirror.

Do not confuse resource flows with cross-pipeline control and data contracts:
an upstream trigger starts another pipeline; an artifact transfers durable
bytes. Both may be shown beside the resource topology, but they have their own
lifecycle semantics.
