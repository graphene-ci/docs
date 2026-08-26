---
sidebar_position: 8
title: "apply, delete, transfer, invoke, kinds"
sidebar_label: Lifecycle verbs
---

# apply, delete, transfer, invoke, kinds

The verbs that create records, change their life, and discover what
exists. All take the target as `<kind> <id>` or `kind/id`.

None of them know the installation's vocabulary: which kinds exist and
which commands each answers is asked of the **dictionary** — the
`kind/*` records (see [kinds](#kinds)) — never carried in the client.
A kind added on the server, or brought by a pipeline's manifest, shows
up in completion and forms without a client rebuild.

## apply

```text
graphenectl apply <kind> <id> [--spec JSON] [-f file.yaml] [-l k=v]
```

Declares a record of any declarable kind. The spec is validated against
the kind's own Go type at the door — a typo fails the call, not a
workflow.

| Flag | What it does |
|---|---|
| `--spec` | the declaration as inline JSON |
| `-f, --file` | one or more declarations from a YAML/JSON file (`kind`, `id`, `spec`) |
| `-l, --label` | record label, repeatable |

On a terminal, `apply <kind> <id>` with no `--spec` walks the kind's
spec schema field by field — the form comes from the dictionary:

```console
$ graphenectl apply gitsource main
gitsource spec (an empty answer skips an optional field):
  pipelineId (string, required): perf-nightly
  url (string, required): https://github.com/acme/pipelines
  ref (string): main
  subdir (string): full
  runtime (string): go
gitsource/main applied
```

Everything that used to have a wrapper is an apply now: roles,
bindings, service accounts, variables, namespaces, sources.

```console
$ graphenectl apply role ci-reader --spec '{"rules":[{"verbs":["get","list"],"kinds":["pipeline","run"]}]}'
$ graphenectl apply var yc-zone --spec '{"value":"ru-central1-a"}'
$ graphenectl apply namespace team-b --spec '{"retentionDays":14}'
```

## delete

```text
graphenectl delete <kind> <id> [--wait]
```

Signals deletion: the record's finalize runs (the real resource is torn
down, and the record's own **blobs go with it** — a source sweeps its
tree, a revision its snapshot and build log). Deletion cascades: owned
children die first. Deleting a `run` cancels it — the run tears its own
resources down on the way out.

| Flag | What it does |
|---|---|
| `--wait` | block until the record is `deleted` or gone entirely |

## transfer

```text
graphenectl transfer <kind> <id> <new-owner> [--keep <duration>]
```

Ownership moves one way: you can give a record away, never take it
back. Transfer to a **stand** (`stand/<pipelineId>`) is how a resource
outlives its run; `--keep` bounds the stay — the stand's own timer
collects it after the TTL. A non-zero `--keep` is valid only for stand
destinations — the server refuses it elsewhere.

```console
$ graphenectl transfer docker-volume cache-v1 stand/perf-nightly --keep 72h
docker-volume/cache-v1 -> stand/perf-nightly
```

## invoke

```text
graphenectl invoke <kind> <id> <command> [--data JSON | --data-file f.yaml]
```

Sends one of the record's own commands. The payload travels raw to the
record, which validates it itself — so invoke works for every kind,
including the ones a pipeline brings. Completion offers the commands
from the dictionary; on a terminal, no `--data` walks the command's
payload schema the same way apply does.

```console
$ graphenectl invoke pipeline perf-nightly activate --data '{"revisionId":"a9bf6299f2d5b3b3"}'
{"digest":"sha256:6e803c…","changed":true}

$ graphenectl invoke gitsource main sync
{"treeDigest":"sha256:2a5531…","commit":"4f2b8f98…","generation":2}

$ graphenectl invoke managedsource fix-timeout revert --data '{"generation":2}'
```

## kinds

```text
graphenectl kinds [-v]
```

The dictionary, formatted. The same data is ordinary records — `get
kind` lists it, `get kind/docker` reads one entry whole (origin,
declarability, spec and command schemas, who brings it, how many
records live).

```console
$ graphenectl kinds
KIND            ORIGIN   APPLY  RECORDS  COMMANDS
agent           system   *      1        entity-set-labels
docker          brought         0        entity-set-labels
gitsource       system   *      2        sync, entity-set-labels
managedsource   system   *      1        write, revert, entity-set-labels
pipeline        system   *      2        fire, publish-manifest, activate, entity-set-labels
…
```

`ORIGIN brought` marks kinds whose definitions live in a pipeline's
binary (docker, k8s resources): the server lists, shows and commands
their records, but only a run's worker executes them — which is why
they are not declarable with apply. Their entries appear when a
manifest lands and remove themselves when no pipeline brings them and
no records remain.
