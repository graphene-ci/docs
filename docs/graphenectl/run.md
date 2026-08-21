---
sidebar_position: 9
title: run
sidebar_label: run
---

# run

```text
graphenectl run start <pipeline> [flags]
graphenectl run watch <run-id> [flags]
graphenectl run result | cancel <run-id>
graphenectl run list [flags]
```

The run **lifecycle** verbs. Reading runs is the ordinary record
grammar — `get run`, `get run <id>`, `events run <id>` — the way
kubectl keeps `rollout` apart from `get`.

## run start

Starts a run of an **already pushed** pipeline. The worker image comes
from the pipeline record — a re-run needs no source checkout. Params
are validated against the pipeline's manifest **at the door**: a bad
submit fails immediately, field by field, not on a machine.

| Flag | Default | What it does |
|---|---|---|
| `--params <json>` | — | typed params as inline JSON |
| `--params-file <path>` | — | params from a JSON or YAML file; `-` reads stdin |
| `--run-id <id>` | `<pipeline>-<timestamp>` | the run's name; the same id attaches, never forks |
| `--image <ref>` | the pipeline record's | worker image override |
| `-l k=v` | repeatable | run labels — the same label language records use |
| `--watch` | off | follow the run to its end (see `run watch`) |

`--params` and `--params-file` are mutually exclusive. A YAML file
converts to JSON on the way; durations are accepted both as `"1h"`
strings and as nanosecond numbers.

```console
$ graphenectl run start perf-nightly --params '{"folderId":"f1","zone":"ru-central1-a","keep":"1h", ...}'
run perf-nightly-20260821-112341 started (managed: true)
perf-nightly-20260821-112341
```

```console
$ graphenectl run start perf-nightly --params-file params.yaml --watch
```

A bad submit fails with the manifest's own words:

```console
$ graphenectl run start perf-nightly --params '{"zone":123}'
graphenectl: invalid_argument: params do not match the pipeline's manifest:
  folderId: ERROR_CODE_REQUIRED_MISSING (required); zone: ERROR_CODE_TYPE_MISMATCH
```

### The terminal form

On a terminal, `run start` with **no params at all** walks the
pipeline's params schema field by field — required fields re-ask,
optional ones skip on an empty answer, compound fields take JSON:

```console
$ graphenectl run start perf-nightly
params (an empty answer skips an optional field):
  folderId (string, required): f1
  zone (string, required): ru-central1-a
  keep (duration, e.g. 1h30m, required): 45m
  ...
run perf-nightly-20260821-145012 started (managed: true)
```

Off a terminal the behavior is unchanged (the server rejects missing
required fields).

## run watch

```text
graphenectl run watch <run-id> [--plain] [--collapse] [--logs none|tail|all]
```

The live view of a run: the ownership tree of its resources, each node
carrying its phase, elapsed time, retry counter, its recent history
events (`⚡`, errors as `✗`) and a log tail (`·`); the run's own strip
at the bottom. On a terminal the panel redraws in place and the last
frame stays on screen; the exit code mirrors the terminal status.

| Flag | Default | What it does |
|---|---|---|
| `--plain` | auto off a terminal | append-only feed instead of the panel — grep- and CI-friendly |
| `--collapse` | off | fold `ready` resources to one line |
| `--logs` | `tail` | log lines per node: `none`, `tail` (2), `all` |

The panel:

```text
run perf-nightly-20260821-1450   Running   1m42s
│
├─ agent/edge-1                        ready      52s
│   ⚡ capability docker published
│   · docker 27.1.1 installed, daemon up
├─ k8s.vpc…Network/net                 creating   1m40s   ↻ attempt 4
│   ✗ activity-failed  k8s.apply — secret "kubeconfig" not found
│   · ERROR Activity error. ActivityType k8s.apply Attempt 3
└─ docker/nginx                        ready      12s
──────────────────────────────────────────────────────────
run  ⚡ activity-completed run-work @bare-1
     · INFO fan-out complete n=2
```

The same model as a plain feed:

```console
$ graphenectl run watch perf-nightly-20260821-112341 --plain
14:23:42  run/perf-nightly-20260821-112341 status Running
14:23:42  run/perf-nightly-20260821-112341 ⚡ run-started
14:23:44  run/perf-nightly-20260821-112341 ⚡ activity-scheduled  server.agent.declare
14:23:46  run/perf-nightly-20260821-112341 · INFO  Started Worker ...
```

On success the typed Result prints to stdout and the exit code is 0; a
failed, canceled, or terminated run exits 1 with the status in the
error.

## run result

Waits for the run and prints its typed Result as JSON:

```console
$ graphenectl run result run-e2e
{"report":"pid=73805","fanOut":1,"baselineDigest":"sha256:..."}
```

## run cancel

Asks the run to stop — the guaranteed-teardown path still runs (unlike
a hard terminate):

```console
$ graphenectl run cancel perf-nightly-20260821-112341
run perf-nightly-20260821-112341: cancel requested (teardown still runs)
```

## run list

Sugar over `get run` with the same flags (`-p`, `-l`, `-w`,
`--chunk-size`):

```console
$ graphenectl run list -p Running
RUN     PIPELINE      STATUS   LABELS
demo-2  perf-nightly  Running  team=perf
```
