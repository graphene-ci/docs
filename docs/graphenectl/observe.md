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
| `--query <expr>` | logs, metrics, trace | your own query in the backend's language, evaluated **inside the record** (below) |
| `--start`, `--end` | logs, metrics | the window: RFC3339, or a duration ago (`-2h`, `-10m`) |
| `--step <dur>` | metrics | the range's resolution (`30s`, `1m`); default range/200, at least 15 s; at most 11 000 points per series |
| `--limit <n>` | logs | records per page (default 1000, at most 10 000) |
| `--desc` | logs | newest first |
| `--page <token>` | logs | continue from the token the previous page printed |
| `--severity`, `--stream`, `--agent`, `--entity`, `--text` | logs | filters, ANDed: severities (repeatable), a job's stream, the emitting agent, the record a line is about, a text the body contains |
| `--facets <fields>` | logs | count the values of these fields within the selection instead of listing it |
| `--traces <n>` | trace | traces in the snapshot (default 20) |

### Two query forms

Every dimension takes a query in its backend's own language — LogsQL,
PromQL, Jaeger search parameters — in two forms that differ in **whose
question** it is:

- **Raw** — the query alone, no record: `graphenectl metrics 'rate(...)'`.
  The whole store, an administrator's surface.
- **Scoped** — the query with a record: `graphenectl metrics run x --query
  'rate(stroppy_ops_total[1m])'`. The same language, but the door lays the
  record's scope over it — its namespace, its correlation labels, its
  birth — in a way the expression cannot escape: a LogsQL filter is
  fenced in parentheses inside the scope, a PromQL expression gets the
  scope applied by the backend to every selector and subquery, Jaeger
  parameters keep the scope's tags over the caller's. Authorized like any
  read of the record — no administrator needed.

  A LogsQL filter must be closable: parentheses balanced outside string
  literals, literals terminated, no pipe. `*) OR (…` would close the
  fence from inside, so it is refused as an invalid argument before any
  backend sees it; behind the fence the backend also gets the namespace
  as its own extra filter. `--query` does not combine with `-f`: live
  records cannot be filtered in the backend's language, so a follow
  takes the selection flags (`--severity`, `--stream`, `--agent`,
  `--entity`, `--text`) and applies them to the live tail too.

Plus the [connection flags](common-flags.md) and the
[output forms](outputs.md) (`--jq` runs per streamed message).

## events

The record's own history, classified but never dropped. Temporal's own
bookkeeping (`internal-*`: workflow tasks, timers) is most of a history
and none of its story — the default view leaves it out and says how many
lines it hid; `-o wide` prints it, `-o json` always carries it.

```console
$ graphenectl events run logs-test-2
20:55:55.091  run-started
20:55:57.549  activity-scheduled   server.agent.declare
20:56:03.128  activity-completed   server.agent.declare
20:57:12.331  activity-failed      k8s.apply  @edge-1  secret "kubeconfig" not found
… 41 internal events hidden; -o wide shows them
```

On a terminal the kind is colored by how it went: scheduled and started
yellow, completed green, failed and timed out red, canceled purple.

A **milestone** the pipeline emitted (`obs.Event`) is an event of kind
`note`: its subject is the milestone's name, its input the payload.
`--kind` keeps only the kinds named (repeatable) and filters on the
server — a long run's dozen milestones read without its whole history:

```console
$ graphenectl events run nightly-0917 --kind note
14:10:02.118  note                 bench.started  {"vus":4}
14:11:11.795  note                 stand.kept  {"root":"agent/db-1","keep":"2h"}
```

Count what failed:

```console
$ graphenectl events run logs-test-2 --jq '.kind' | sort | uniq -c | sort -rn
      6 activity-scheduled
      1 run-terminated
      1 run-started
```

## logs

A **selection**, not a tail: a window, a page, filters. Records come
oldest first (`--desc` for newest first), one page at a time; the page
closes with a line on stderr saying how many came and, when the selection
has more, the token that continues it — equal timestamps are never lost
across pages.

```console
$ graphenectl logs run nightly-0917 --severity WARN,ERROR --stream stderr --start -30m --limit 200
14:11:06.800  WRN  infra-tests │ job infra-tests exited with status 1
14:11:08.891  ERR  bench │ connection refused
… 200 of more; next page: --page MTc5MDA...
$ graphenectl logs run nightly-0917 --query 'level:error AND _msg:~"timeout.*pg"'
$ graphenectl logs run nightly-0917 --facets severity,job
FIELD     VALUE        RECORDS
severity  INFO              61
          WRN                2

job       infra-tests       58
          bench              5
```

```console
$ graphenectl logs run logs-test-2
20:55:58.269  INF  Started Worker Namespace default TaskQueue run/logs-test-2
20:55:58.269  DBG  ExecuteActivity ... ActivityType k8s.apply
20:56:41.002  INF  infra-tests │ 3 passed in 7.80s
20:57:12.331  ERR  secret "kubeconfig" not found
```

Each line is the time, a three-letter level (`DBG` `INF` `WRN` `ERR`), the
source a library stamped on the record — a docker job's name — and the
body. A warning is yellow and an error red **as a whole line**: in a
scroll of output they must not look like the rest. `-o wide` appends
every attribute of the record.

A tool's output carries no severity of its own — pytest, a compiler, a
shell script are all recorded at one level. There the level stays what
the emitter said and the **telling words** are marked instead: `FAILED`,
`ERROR`, `Traceback`, `2 failed` in red, `WARNING`, `3 warnings` in
yellow, `PASSED`, `3 passed` in green, and a pytest `E   …` explanation
red as a whole.

For a run this includes the orchestrator container's own stdout — the
raw inside of the worker, tailed by the server.

## metrics

A series table with a trend line by default; `-o wide` draws every
series as a chart; `-o json` prints the backend's standard PromQL range
response as-is, `--jq` runs over it. With `-f` the snapshot is followed
by live points as they pass the collector. `--step` sets the resolution;
`--query` evaluates your own PromQL inside the record — the tool's native
metrics (`stroppy_*`) included, whichever spelling of the correlation
labels the store holds:

```console
$ graphenectl metrics run nightly-0917 --query 'rate(stroppy_ops_total[1m])' --step 30s --start -1h
```

```console
$ graphenectl gitsource/main metrics -f
No metrics recorded.
14:57:32.829  graphene.activity = 2
14:57:32.829  graphene.door.invoke = 2
```


```console
$ graphenectl metrics run logs-test-2
METRIC                         N    VALUE      MIN      MAX  TREND     SERIES
docker.container.memory.bytes  3  68.6MiB  68.6MiB  70.5MiB  ▄██▁      activity=docker.container.observe agent=db-1
graphene.activity.seconds      2    9.46s    4.05s    9.46s  ▁████     activity=docker.job agent=db-1
                               2   38.86s   14.59s   38.86s  ▁▁▁▁█     activity=docker.job agent=runner-1
stroppy.iterations_per_second        2493     2493     2493  ▁         activity=publish-metrics agent=runner-1
```

How to read a row:

- a metric is named once, its series follow underneath;
- `SERIES` is the label set with the noise removed — the labels every
  row of one record shares (the run, the contour) and the `graphene.`
  prefix are dropped;
- a **histogram** folds into one row: `N` is how many observations,
  `VALUE` their average, and the trend is that average over time;
- the unit comes from the metric's name, OTel's own convention:
  `…seconds` reads as a duration, `…bytes` in binary units, `…percent`
  with a `%`.

```console
$ graphenectl metrics run logs-test-2 -o wide
docker.container.memory.bytes (average)  activity=docker.container.observe agent=db-1
70.5MiB ┤                  ██████████████████
        ┤                  ██████████████████
69.6MiB ┤▂▂▂▂▂▂▂▂▂▂▂▂▂▂▂▂▂▂██████████████████
        ┤████████████████████████████████████
        ┤████████████████████████████████████
68.6MiB ┤████████████████████████████████████▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁
         13:09:36                                      13:10:30
```

```console
$ graphenectl metrics run logs-test-2 -o json
{"status":"success","data":{"resultType":"matrix","result":[...]}}
```

## trace

A waterfall: each trace is a tree of spans by parentage, and every span
has its bar on a shared time track — where in the trace it sat and for
how long. A failed span is red. `-o json` prints the standard Jaeger
JSON, `--jq` runs over it:

```console
$ graphenectl trace run logs-test-2
trace 22913539a7ae5e371090460ae51607fd  13:10:15.510  1.58s
StartActivity:server.artifact.declare · graphene-pipeline      100µs  ▏       ━
└─ RunActivity:server.artifact.declare · graphene-pipeline     1.08s  ▏        ━━━━━━━━━━━━━━━━━━━━━━━━━━━
StartActivity:publish-metrics · graphene-pipeline              146µs  ▏                                       ━
└─ RunActivity:publish-metrics · graphene-pipeline            20.9ms  ▏                                       ━
```

A span too short to see at the trace's scale still gets one cell — it
happened.

```console
$ graphenectl trace run logs-test-2 --jq '.data[0].spans | length'
128
```

## What an answer means

The door answers by **code**, never by silence or by text alone:

| Answer | Means |
|---|---|
| records, then a page line on stderr | the selection; `… N of more` names the next page token |
| `<ref> has no log records in this selection.`, exit 0 | the record exists, the selection is empty |
| `no record <ref>`, exit 2 | there is no such record |
| `invalid_argument` | the query, the step or a filter is wrong — the backend's own words follow |
| `unavailable` | the backend did not answer or answered 5xx |
| `unimplemented` | no backend behind that dimension, or a scoped PromQL query on a backend without `extra_filters` |
| `permission_denied` | the token may not read the record, or asked for the raw surface without being an administrator |
| `... N lines dropped` on stderr | a follow shed lines to a slow consumer |
