---
sidebar_position: 11
title: "secret, var, namespace"
sidebar_label: secret, var, ns
---

# secret, var, namespace

All three are **records** — declared, listed, read and deleted with the
generic verbs. The only special command left is the one channel a
secret's *value* travels.

## secret

A secret is two-layered: the **record** (`kind: secret`) holds the
name's life — its version counter and rotation history — while the
**value** lives sealed in the server's value store and never comes
back out. Only names ever travel: in specs, logs, history, and this
CLI's output.

```text
graphenectl secret set <name> [--value <v> | --value-file <path>]
```

| Flag | What it does |
|---|---|
| `--value` | the value inline |
| `--value-file` | the value from a file — raw bytes, never converted |
| *(neither)* | read the value from stdin |

```console
$ pass show github | graphenectl secret set gh-token
secret gh-token set (version 1)
```

Everything else is generic — and deleting the record takes the value
with it:

```console
$ graphenectl get secret
$ graphenectl events secret gh-token       # every rotation
$ graphenectl delete secret gh-token --wait
```

## var

The visible sibling: environment configuration (folder ids, hosts)
that does not belong in pipeline code but is not sensitive. The value
lives in the record and reads back. Params reference one as
`${var:name}` — the door substitutes the value on run start, before
validation; a missing variable fails the submit at the door.

```console
$ graphenectl apply var yc-zone --spec '{"value":"ru-central1-a"}'
$ graphenectl invoke var yc-zone set --data '{"value":"ru-central1-b"}'
$ graphenectl get var
$ graphenectl delete var yc-zone
```

## namespace

A graphene namespace is the isolation unit — symmetric to a Temporal
namespace: records, queues, visibility, the ownership tree. Namespaces
are records too, and they live in the **system namespace**
`graphene-system` (a container cannot hold its own declaration), which
also holds the installation's roles, bindings and service accounts.
`graphene-system` is protected. `default` is created on the first boot as an
ordinary project namespace and may be deleted; a restart does not recreate a
known retired record.

```console
$ graphenectl apply namespace team-b --spec '{"retentionDays":14}'
$ graphenectl get namespace
REF                        PHASE  OWNER  LABELS
namespace/graphene-system  ready
namespace/default          ready
namespace/team-b           ready
$ graphenectl delete namespace team-b --wait
```

Deleting a namespace **retires** it: the installation stops serving it,
but what it holds is not destroyed — it ages out under its own
retention. A retired namespace stays retired: neither a call naming it
nor a server restart brings it back.
