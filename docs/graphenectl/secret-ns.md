---
sidebar_position: 11
title: "secret, ns"
sidebar_label: secret, ns
---

# secret, ns

## secret

```text
graphenectl secret set <name> [--value <v> | --value-file <path>]
graphenectl secret list
graphenectl secret delete <name>
```

Secrets live encrypted on the server; **only names ever travel** — in
specs, logs, history, and in this CLI's output. A worker resolves the
value at the point of use.

| Flag | What it does |
|---|---|
| `--value` | the value inline |
| `--value-file` | the value from a file — raw bytes, never converted |
| *(neither)* | read the value from stdin |

```console
$ graphenectl secret set gh-token --value-file token.txt
secret gh-token set
```

```console
$ pass show github | graphenectl secret set gh-token
secret gh-token set
```

```console
$ graphenectl secret list
gh-token
kubeconfig
```

```console
$ graphenectl secret delete gh-token
secret gh-token deleted
```

## ns

```text
graphenectl ns list
graphenectl ns create <name> [--retention-days <n>]
```

A graphene namespace is the isolation unit — symmetric to a Temporal
namespace: records, queues, visibility, the ownership tree, all
isolated by the durable core itself. Tokens are scoped to one
namespace; `ns` verbs need an admin token.

| Flag | Default | What it does |
|---|---|---|
| `--retention-days` | the server default (30) | closed-workflow retention |

```console
$ graphenectl ns list
default
team-b
```

```console
$ graphenectl ns create team-b --retention-days 14
namespace team-b created
```
