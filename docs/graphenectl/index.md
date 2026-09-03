---
sidebar_position: 1
title: Overview
sidebar_label: Overview
---

# graphenectl

`graphenectl` is the control CLI of a graphene installation. It manages
**records**: resources with their five dimensions, runs, sources,
secrets, namespaces, connection contexts. Its stance and grammar are
kubectl's — the verb comes first, the kind second — and the client
**knows no vocabulary of its own**: which kinds exist and which
commands each answers is asked of the installation's dictionary (the
`kind/*` records), so completion and interactive forms follow the
server without a client rebuild.

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

Wire the shell completion right away — the grammar, the kinds, the ids
and the commands all complete, so nobody guesses (`graphenectl get
d<TAB>` offers `docker`, `docker-volume`, `docker-network` even before
any records exist — the kinds come from the dictionary, which the
pipelines' manifests feed):

```console
$ source <(graphenectl completion bash)     # zsh and fish: see Project commands
```

## Grammar

```text
graphenectl <verb> <kind> [id] [flags]     # records: apply, get, delete, invoke, …
graphenectl <kind>/<id> <dimension> [-f]   # resource-first observing: pipeline/x logs -f
graphenectl run <lifecycle-verb> ...       # run lifecycle
graphenectl <noun> <verb> ...              # ctx, secret, source, revision, account
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
- **Exit codes**: `0` success, `1` failure — a watched run's terminal
  status maps to the exit code.
- **Flags parse on either side of positionals**:
  `graphenectl secret set demo --value x` and
  `graphenectl secret set --value x demo` are the same command.
- Common failures print a one-line `hint:` with the next step:

```console
$ graphenectl get namespace
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
| [Lifecycle verbs](lifecycle.md) | `apply`, `delete`, `transfer`, `invoke`, `kinds` |
| [run](run.md) | starting and following runs |
| [pipeline & sources](pipeline.md) | the project: sources, revisions, activation |
| [secret, var, ns](secret-ns.md) | values and namespaces as records |
| [Access and accounts](access.md) | roles, bindings, service accounts, tokens and `whoami` |
| [Agent shell](agent.md) | an interactive diagnostic terminal over the outbound agent session |
| [Project commands](project.md) | `init`, `completion`, `version` |
