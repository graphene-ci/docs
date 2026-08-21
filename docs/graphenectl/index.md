---
sidebar_position: 1
title: Overview
sidebar_label: Overview
---

# graphenectl

`graphenectl` is the control CLI of a graphene installation. It manages
**records**: resources with their five dimensions, runs, secrets,
namespaces, connection contexts. Its stance and grammar are kubectl's —
the verb comes first, the kind second.

What it deliberately does **not** do: build, push, or start *your*
pipeline from source. The pipeline binary manages its own pipeline —
`./your-pipeline push`, `./your-pipeline run` — using the same
connection contexts. `graphenectl run start` starts a run of an
**already pushed** pipeline: the worker image comes from the pipeline
record, no checkout needed.

## Install

`graphenectl` is a single static binary built from the graphene
repository:

```console
$ go build -o ~/bin/graphenectl ./cmd/graphenectl
```

## First contact

```console
$ echo $TOKEN | graphenectl login --server graphene.example:7233 --token-stdin
logged in: context graphene.example, role run, namespace team
```

`login` verifies the server and the token with a handshake **before**
writing anything, then saves the context and makes it current. See
[Contexts](contexts.md).

## Grammar

```text
graphenectl <verb> <kind> [id] [flags]     # records
graphenectl run <lifecycle-verb> ...       # run lifecycle
graphenectl <noun> <verb> ...              # ctx, secret, ns, pipeline
```

A record target is written either as two words or as one ref:

```console
$ graphenectl get docker-volume my-vol
$ graphenectl get docker-volume/my-vol     # the same
```

A run is a record like any other — kind `run`: `get run`, `get run
<id>`, `events run <id>` all work. Only the lifecycle verbs live under
`run` (`start`, `watch`, `result`, `cancel`, `list`), the way kubectl
keeps `rollout` apart.

## Conventions

- **stdout is data, stderr is progress.** Pipe stdout anywhere; the
  human-facing chatter never contaminates it.
- **Exit codes**: `0` success, `1` failure (a watched run's terminal
  status maps to the exit code), `2` usage errors.
- **Flags parse on either side of positionals**:
  `graphenectl secret set demo --value x` and
  `graphenectl secret set --value x demo` are the same command.
- Common failures print a one-line `hint:` with the next step:

```console
$ graphenectl ns list
graphenectl: unauthenticated: 401 Unauthorized
  hint: the token was rejected — check `graphenectl ctx show`, or re-run `graphenectl login`
```

## The pages

| Page | What lives there |
|---|---|
| [Contexts](contexts.md) | `login`, `ctx`, the config file and the environment chain |
| [Connection flags](common-flags.md) | `--context`, `--config`, `-n` — on every network command |
| [Output forms](outputs.md) | `-o table\|wide\|name\|json\|yaml`, `--jq`, `-w`, `--chunk-size` |
| [get](get.md) | listing records and reading one |
| [Observing](observe.md) | `events`, `logs`, `metrics`, `trace` |
| [tree](tree.md) | the ownership tree |
| [Lifecycle verbs](lifecycle.md) | `delete`, `transfer`, `invoke` |
| [run](run.md) | starting and following runs |
| [pipeline](pipeline.md) | the pipeline record |
| [secret, ns](secret-ns.md) | secrets and namespaces |
| [Project commands](project.md) | `init`, `completion`, `version` |
