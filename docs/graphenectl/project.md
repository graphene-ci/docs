---
sidebar_position: 12
title: "init, completion, version"
sidebar_label: Project commands
---

# init, completion, version

## init

```text
graphenectl init <name>
```

Scaffolds a pipeline project in the current directory: `main.go` with
a typed `pipeline.Main`, a `Dockerfile`, a `Makefile`. One main == one
pipeline; from there the binary manages itself (`go run . push`,
`go run . run`).

```console
$ graphenectl init perf-nightly
  main.go
  go.mod
  Dockerfile
  Makefile
```

## completion

```text
graphenectl completion bash|zsh|fish
```

Prints the shell hook. Completion covers the whole grammar — commands,
subcommands, flags — and looks things up **live** where it can (a 2s
best-effort timeout, silent when the server is away): kinds and ids
from the installation, context names from the local file.

```console
$ source <(graphenectl completion bash)     # ~/.bashrc
$ source <(graphenectl completion zsh)      # ~/.zshrc
$ graphenectl completion fish | source      # config.fish
```

What it feels like:

```console
$ graphenectl get <TAB>
agent  all  artifact  docker-volume  pipeline  run  stand
$ graphenectl get run <TAB>
logs-test-2  watch-demo  perf-nightly-20260821-112341
$ graphenectl ctx use <TAB>
dev  dev-admin
```

## version

```console
$ graphenectl version
graphenectl dev
```
