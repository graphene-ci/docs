---
sidebar_position: 8
title: "delete, transfer, invoke"
sidebar_label: Lifecycle verbs
---

# delete, transfer, invoke

The verbs that change a record's life. All three take the target as
`<kind> <id>` or `kind/id`.

## delete

```text
graphenectl delete <kind> <id> [--wait]
```

Signals deletion: the record's finalize runs (the real resource is torn
down), then the record reaches `deleted`. Deletion cascades: owned
children die first.

| Flag | What it does |
|---|---|
| `--wait` | block until the record is `deleted` or gone entirely |

```console
$ graphenectl delete docker-volume cache-v1
docker-volume/cache-v1: deletion signaled
```

```console
$ graphenectl delete docker-volume cache-v1 --wait
docker-volume/cache-v1: deleting...
docker-volume/cache-v1: deleted
```

## transfer

```text
graphenectl transfer <kind> <id> <new-owner> [--keep <duration>]
```

Ownership moves one way: you can give a record away, never take it
back. Transfer to a **stand** (`stand/<pipelineId>`) is how a resource
outlives its run; `--keep` bounds the stay — the stand's own timer
collects it after the TTL. A non-zero `--keep` is valid only for stand
destinations — the server refuses it elsewhere.

| Flag | Default | What it does |
|---|---|---|
| `--keep` | `0` (keep until an explicit delete) | TTL under the new owner, e.g. `72h` |

```console
$ graphenectl transfer docker-volume cache-v1 stand/perf-nightly --keep 72h
docker-volume/cache-v1 -> stand/perf-nightly
```

## invoke

```text
graphenectl invoke <kind> <id> <command> [--data JSON | --data-file f.yaml]
```

Sends one of the record's own commands — the typed updates its kind
defined. The payload is the command's request; the answer is the
command's response as JSON.

| Flag | What it does |
|---|---|
| `--data` | the payload as inline JSON |
| `--data-file` | the payload from a JSON or YAML file; `-` reads stdin |

The two are mutually exclusive; a YAML file converts to JSON on the
way (see the same convention in [run](run.md)).

```console
$ graphenectl invoke agent vm-1 transfer-owner --data '{"newOwner":"stand/perf-nightly"}'
{}
```

```console
$ graphenectl invoke stand perf-nightly extend --data-file extend.yaml
```
