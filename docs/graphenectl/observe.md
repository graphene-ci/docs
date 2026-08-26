---
sidebar_position: 6
title: "events, logs, metrics, trace"
sidebar_label: Observing
---

# events, logs, metrics, trace

```text
graphenectl events  <kind> <id> [-f]
graphenectl logs    <kind> <id> [-f]
graphenectl metrics <kind> <id> [-f]
graphenectl trace   <kind> <id> [-f]

graphenectl <kind>/<id> logs -f        # the resource-first twin
```

Every record in graphene has five dimensions; `get` reads the first
(state), these four verbs read the rest. They work on ANY record —
`docker/nginx`, `agent/vm-1`, and runs by bare id (`events run my-run`).
The dimensions belong to the record, so the record may come first:
`graphenectl pipeline/x logs -f` is the same command as
`graphenectl logs pipeline/x -f`.

| Dimension | Verb | Source |
|---|---|---|
| 2 — events | `events` | the record's own workflow history: the plane of truth |
| 3 — logs | `logs` | history from the log backend, then **live push** |
| 4 — metrics | `metrics` | a PromQL range snapshot, then **live push** |
| 5 — trace | `trace` | a Jaeger JSON snapshot, then **live push** |

**Follow is a push, not a poll.** The server door is already the
collector — every signal of every worker passes through it — so a
`-f` stream is fed the moment a signal arrives. For logs the
subscription opens *before* the history read and the seam is
deduplicated, so the moment between past and present cannot lose a
line. Live metric and span entries are standard OTLP records; a slow
consumer sheds oldest and is told how many were dropped
(`... N lines dropped (slow consumer)` on stderr).

## Flags

| Flag | Commands | What it does |
|---|---|---|
| `-f, --follow` | all four | keep streaming live entries until you stop it |

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

A readable series table by default; `-o json` prints the backend's
standard PromQL range response as-is, `--jq` runs over it. With `-f`
the snapshot is followed by live points as they pass the collector:

```console
$ graphenectl gitsource/main metrics -f
No metrics recorded.
14:57:32.829  graphene.activity = 2
14:57:32.829  graphene.door.invoke = 2
```


```console
$ graphenectl metrics run logs-test-2
METRIC                      POINTS  LAST
process_cpu_seconds_total   42      3.17
```

```console
$ graphenectl metrics run logs-test-2 -o json
{"status":"success","data":{"resultType":"matrix","result":[...]}}
```

## trace

A span table sorted by start time; `-o json` prints the standard
Jaeger JSON, `--jq` runs over it:

```console
$ graphenectl trace run logs-test-2
START         DURATION  OPERATION                  SERVICE
20:16:07.015  0.1ms     StartActivity:k8s.observe  graphene-pipeline
20:16:07.070  36.6ms    RunActivity:k8s.observe    graphene-pipeline
```

```console
$ graphenectl trace run logs-test-2 --jq '.data[0].spans | length'
128
```

A dimension without a configured backend answers with a clear
`unimplemented` error, not silence. An empty dimension prints a note
to stderr (`No log records.`, `No metrics recorded.`) and exits 0 —
stdout stays clean for pipes.
