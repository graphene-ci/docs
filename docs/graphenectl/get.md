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
REF                    PHASE  OWNER  LABELS
pipeline/perf-nightly  ready
agent/vm-e2e           ready         role=e2e,graphene.io/run=run-e2e
```

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
RUN          PIPELINE      STATUS      LABELS
watch-demo   perf-nightly  Terminated
val-c        perf-nightly  Terminated
```

One record in full — the header fields, then the spec and the state as
YAML blocks:

```console
$ graphenectl get pipeline perf-nightly
ref:    pipeline/perf-nightly
phase:  ready
owner:
labels:
spec:
  {}
state:
  concurrency: queue
  digest: sha256:abc82597…
  image: localhost:7233/default/perf-nightly:4f925b8c6e5fff45
  manifest:
    activities:
    - docker.container.remove
    - docker.container.run
    ...
```

One run — its status:

```console
$ graphenectl get run watch-demo
Terminated
```

An empty answer says so (on stderr — stdout stays clean):

```console
$ graphenectl get docker-volume
No records found.
```
