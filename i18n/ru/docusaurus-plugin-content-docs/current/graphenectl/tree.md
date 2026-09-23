---
sidebar_position: 7
title: tree
sidebar_label: tree
---

# tree

```text
graphenectl tree [owner-ref] [--include-deleted]
```

Дерево владения под одним владельцем: тот же рекурсивный обход по
`EntityOwner`, которым идёт каскадное удаление, только читающий. Оно
отвечает на вопрос «что умрёт вместе с этим владельцем».

Аргумент — полный owner-ref: `run/x`, `stand/p`, `agent/vm-1` (агент
владеет контейнерами на своей машине). Без аргумента команда печатает
корни леса: каждую запись, которой никто не владеет, вместе с её
поддеревом. Узлы идут в порядке ref; словарь kinds в корни не входит —
это [`kinds`](lifecycle.md#kinds).

Дерево **прогона всегда полное**: завершённый прогон — история, и его
топология после сноса — ровно то, ради чего сюда приходят: машины и
контейнеры показаны с `phase: deleted`, настолько назад, насколько
retention namespace хранит их history.

```console
$ graphenectl tree run/nightly-0917
run/nightly-0917
├─ agent/db-1                                  deleted   2d3h
│  └─ docker/pg                                deleted   2d3h
└─ agent/runner-1                              deleted   2d3h
```

Дерево любого другого владельца — из **живых** записей;
`--include-deleted` добавляет закончившие жизнь. Владелец, у которого не
осталось детей, говорит об этом, а не печатает пустоту.

```console
$ graphenectl tree stand/perf-nightly
stand/perf-nightly
└─ nothing live is owned by stand/perf-nightly
```

## Примеры

```console
$ graphenectl tree run/run-e2e
run/run-e2e
├─ agent/vm-e2e                                ready     3m12s
│  └─ docker-volume/graphene-e2e-run-e2e       ready     2m40s
└─ artifact/e2e-report                         ready     14s
```

```console
$ graphenectl tree stand/perf-nightly
stand/perf-nightly
└─ k8s.compute…Instance/vm-1                   ready     4d1h
   └─ agent/edge-1                             ready     4d1h
```

У каждого узла указаны фаза и возраст; колонки выровнены по всему
дереву.

`-o json` возвращает то же дерево вложенными узлами для скриптов; см.
[Формы вывода](outputs.md).
