---
sidebar_position: 6
title: "events, logs, metrics, trace"
sidebar_label: Observing
---

# events, logs, metrics, trace

```text
graphenectl events  <kind> <id> [--follow]
graphenectl logs    <kind> <id> [--follow]
graphenectl metrics <kind> <id>
graphenectl trace   <kind> <id>
```

Every record in graphene has five dimensions; `get` reads the first
(state), these four verbs read the rest. They work on ANY record —
`docker/nginx`, `agent/vm-1`, and runs by bare id (`events run my-run`).

| Dimension | Verb | Source |
|---|---|---|
| 2 — events | `events` | the record's own workflow history: the plane of truth |
| 3 — logs | `logs` | telemetry (the installation's log backend) |
| 4 — metrics | `metrics` | telemetry, the standard PromQL range answer |
| 5 — trace | `trace` | telemetry, standard Jaeger JSON |

## Flags

| Flag | Commands | What it does |
|---|---|---|
| `--follow` | `events`, `logs` | keep streaming new entries until you stop it |

Plus the [connection flags](common-flags.md) and the
[output forms](outputs.md) (`--jq` runs per streamed message).

## events

The record's own history, classified but never filtered — internal
machinery passes through as `internal-*` lines (hidden in the table
form, present in `-o json`):

```console
$ graphenectl events run logs-test-2
20:55:55.091  run-started
20:55:57.549  activity-scheduled       server.agent.declare
20:56:03.128  activity-completed       server.agent.declare
20:57:12.331  activity-failed          k8s.apply  @edge-1  error: secret "kubeconfig" not found
```

Count what failed:

```console
$ graphenectl events run logs-test-2 --jq '.kind' | sort | uniq -c | sort -rn
      6 activity-scheduled
      1 run-terminated
      1 run-started
```

## logs

```console
$ graphenectl logs run logs-test-2
20:55:58.269  INFO  Started Worker Namespace default TaskQueue run/logs-test-2
20:55:58.269  DEBUG ExecuteActivity ... ActivityType k8s.apply
```

For a run this includes the orchestrator container's own stdout — the
raw inside of the worker, tailed by the server.

## metrics

The backend's standard PromQL range response, as-is — pipe it to
whatever draws:

```console
$ graphenectl metrics run logs-test-2
{"status":"success","data":{"resultType":"matrix","result":[...]}}
```

## trace

Standard Jaeger JSON of the record's traces:

```console
$ graphenectl trace run logs-test-2
{"data":[{"processes":{"p2":{"serviceName":"graphene-pipeline",...}}}]}
```

A dimension without a configured backend answers with a clear
`unimplemented` error, not silence. An empty dimension (a k8s record
has no logs) is a normal empty answer.
