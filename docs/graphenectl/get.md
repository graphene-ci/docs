---
sidebar_position: 5
title: get
sidebar_label: get
---

# get

```text
graphenectl get all|<kind> [flags]        # list
graphenectl get <kind> <id> [flags]       # one record
```

`get` lists records of a kind — or all of them — and reads one record
in full: dimension 1 of the five, the state. A run is a kind like any
other (`get run`); the listing then shows run columns.

## Flags

| Flag | Type | Default | What it does |
|---|---|---|---|
| `-l, --selector k=v` | repeatable | — | label selector, every pair must match |
| `-p, --phase <word>` | string | — | THE lifecycle filter: a record phase (`creating`, `ready`, `deleting`, ...) for kinds, a workflow status (`Running`, `Completed`, `Terminated`, ...) for runs |
| `--owner <ref>` | string | — | records owned by this owner (`run/x`, `stand/p`, `agent/vm-1`) |
| `-w, --watch` | bool | off | watch: the snapshot, then only changes — see [Output forms](outputs.md) |
| `--chunk-size` | int | 500 | list page size — see [Output forms](outputs.md) |

Plus the [connection flags](common-flags.md) and the
[output forms](outputs.md).

## Examples

Every record in the namespace:

```console
$ graphenectl get all
REF                    PHASE  OWNER        AGE    LABELS
agent/vm-e2e           ready  run/run-e2e  3m12s  role=e2e

pipeline/perf-nightly  ready               4d1h
```

Kinds are separated by a blank line: one long column becomes groups.

`all` is the installation's records; the dictionary of kinds is its own
listing — `get kind`, or [`kinds`](lifecycle.md#kinds).

One kind, filtered and watched:

```console
$ graphenectl get docker-volume --owner stand/perf-nightly -w
REF                        PHASE  OWNER               LABELS
docker-volume/cache-v1     ready  stand/perf-nightly
docker-volume/cache-v1     ready  stand/perf-nightly  deleted
```

Runs by status:

```console
$ graphenectl get run -p Terminated
RUN         PIPELINE      STATUS      STARTED    TOOK   LABELS
watch-demo  perf-nightly  Terminated  2h14m ago  1m48s  team=perf
val-c       perf-nightly  Terminated  1d3h ago   42s
```

One record — the header fields, then the spec and the state as
outlines. Empty fields and empty blocks are left out. A record's spec is
whatever its kind's author made it (a docker container's is docker's
whole `Config`), so the default view shows the first three levels and the
first six items of a list, folds the rest into a one-line summary and
says so; `-o yaml` is the whole record.

```console
$ graphenectl get pipeline perf-nightly
ref:    pipeline/perf-nightly
phase:  ready
age:    4d1h
state:
  concurrency: queue
  digest: sha256:abc82597…
  image: localhost:7233/default/perf-nightly:4f925b8c6e5fff45
  manifest:
    activities: [… 14 items]
    params: {… 3 fields}
… long parts are folded; -o yaml shows the whole record
```

One run — what its listing row knows, spelled out:

```console
$ graphenectl get run watch-demo
run:      watch-demo
pipeline: perf-nightly
status:   Terminated
started:  2026-08-21 11:23:41
took:     1m48s
image:    localhost:7233/default/perf-nightly:4f925b8c6e5fff45
trigger:  manual
labels:   team=perf
```

## Nothing, and no such thing

A listing shows **live** records. An empty answer says so, names the
filters that narrowed it (on stderr — stdout stays clean), and exits 0:

```console
$ graphenectl get docker-volume -p ready
No live docker-volume records match phase ready.
```

A kind the installation does not have is a mistake, not an empty set —
the command fails and offers the nearest kinds:

```console
$ graphenectl get agnt
graphenectl: unknown kind "agnt" — did you mean agent? (`graphenectl kinds` lists them)
```

The same line is drawn everywhere: `get`, `delete`, `events`, `logs`,
`run status`, `run result` and `run cancel` answer `no record <ref>` (or
`no run <id>`) with a non-zero exit for a target that does not exist, and
never an empty success.

A record that finished its life is not in the listing, but can still be
read by name — its last spec and state, with `phase: deleted`:

```console
$ graphenectl get agent vm-e2e
ref:    agent/vm-e2e
phase:  deleted
...
```
