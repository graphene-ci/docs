---
sidebar_position: 7
title: tree
sidebar_label: tree
---

# tree

```text
graphenectl tree <owner-ref>
```

Дерево владения под одним владельцем: тот же рекурсивный обход по
`EntityOwner`, которым идёт каскадное удаление, только читающий. Оно
отвечает на вопрос «что умрёт вместе с этим владельцем».

Единственный аргумент — полный owner-ref: `run/x`, `stand/p`,
`agent/vm-1` (агент владеет контейнерами на своей машине).

## Примеры

```console
$ graphenectl tree run/run-e2e
run/run-e2e
  agent/vm-e2e (ready)
    docker-volume/graphene-e2e-run-e2e (ready)
  artifact/e2e-report (ready)
```

```console
$ graphenectl tree stand/perf-nightly
stand/perf-nightly
  k8s.compute…Instance/vm-1 (ready)
    agent/edge-1 (ready)
```

`-o json` возвращает то же дерево вложенными узлами для скриптов; см.
[Формы вывода](outputs.md).
