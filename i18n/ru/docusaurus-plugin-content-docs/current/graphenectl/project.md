---
sidebar_position: 12
title: "init, completion, version"
sidebar_label: Проектные команды
---

# init, completion, version

## init

```text
graphenectl init <name>
```

Создаёт каркас проекта пайплайна в текущей директории: `main.go` с
типизированным `pipeline.Main`, `Dockerfile`, `Makefile`. Один main ==
один пайплайн; дальше бинарь управляет собой сам (`go run . push`,
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
graphenectl completion bash|zsh|fish|powershell
```

Печатает шелл-хук. Дополнение покрывает всю грамматику — команды,
подкоманды, флаги — и, где может, смотрит **вживую** (best-effort с
таймаутом 2s, молчит при недоступном сервере): kinds и id — из
инсталляции, имена контекстов — из локального файла.

```console
$ source <(graphenectl completion bash)     # ~/.bashrc
$ source <(graphenectl completion zsh)      # ~/.zshrc
$ graphenectl completion fish | source      # config.fish
```

Как это ощущается:

```console
$ graphenectl get <TAB>
agent  all  artifact  docker-volume  pipeline  run  stand
$ graphenectl get run <TAB>
logs-test-2  watch-demo  perf-nightly-20260821-112341
$ graphenectl ctx use <TAB>
dev  dev-admin
```

## --version

```console
$ graphenectl --version
graphenectl version dev
```
