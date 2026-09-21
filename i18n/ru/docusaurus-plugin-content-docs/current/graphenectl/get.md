---
sidebar_position: 5
title: get
sidebar_label: get
---

# get

```text
graphenectl get all|<kind> [флаги]        # список
graphenectl get <kind> <id> [флаги]       # одна запись
```

`get` перечисляет записи одного kind — или все — и читает одну запись
целиком: первое из пяти измерений, состояние. Прогон — такой же kind
(`get run`); список тогда показывает колонки прогонов.

## Флаги

| Флаг | Тип | Дефолт | Что делает |
|---|---|---|---|
| `-l, --selector k=v` | повторяемый | — | селектор по лейблам, каждая пара должна совпасть |
| `-p, --phase <слово>` | строка | — | ЕДИНСТВЕННЫЙ фильтр жизненного цикла: фаза записи (`creating`, `ready`, `deleting`, …) для kinds, статус workflow (`Running`, `Completed`, `Terminated`, …) для прогонов |
| `--owner <ref>` | строка | — | записи этого владельца (`run/x`, `stand/p`, `agent/vm-1`) |
| `-w, --watch` | bool | выкл | наблюдение: снапшот, дальше только изменения — см. [Формы вывода](outputs.md) |
| `--chunk-size` | int | 500 | размер страницы — см. [Формы вывода](outputs.md) |

Плюс [флаги подключения](common-flags.md) и [формы вывода](outputs.md).

## Примеры

Все записи неймспейса:

```console
$ graphenectl get all
REF                    PHASE  OWNER        AGE    LABELS
agent/vm-e2e           ready  run/run-e2e  3m12s  role=e2e

pipeline/perf-nightly  ready               4d1h
```

Kinds разделены пустой строкой: одна длинная колонка распадается на
группы.

`all` — это записи инсталляции; словарь kinds — отдельный список:
`get kind` или [`kinds`](lifecycle.md#kinds).

Один kind, с фильтром и наблюдением:

```console
$ graphenectl get docker-volume --owner stand/perf-nightly -w
REF                        PHASE  OWNER               LABELS
docker-volume/cache-v1     ready  stand/perf-nightly
docker-volume/cache-v1     ready  stand/perf-nightly  deleted
```

Прогоны по статусу:

```console
$ graphenectl get run -p Terminated
RUN         PIPELINE      STATUS      STARTED    TOOK   LABELS
watch-demo  perf-nightly  Terminated  2h14m ago  1m48s  team=perf
val-c       perf-nightly  Terminated  1d3h ago   42s
```

Одна запись — заголовочные поля, затем spec и state в виде структуры.
Пустые поля и пустые блоки опускаются. Spec записи — то, каким его
сделал автор kind (у docker-контейнера это весь `Config` докера),
поэтому вид по умолчанию показывает первые три уровня и первые шесть
элементов списка, остальное сворачивает в однострочную сводку и
сообщает об этом; `-o yaml` — запись целиком.

```console
$ graphenectl get pipeline perf-nightly
ref:    pipeline/perf-nightly
phase:  ready
age:    4d1h
state:
  concurrency: queue
  digest: sha256:abc82597…
  image: localhost:7233/default/perf-nightly:4f925b8c6e5fff45
  manifest:
    activities: [… 14 items]
    params: {… 3 fields}
… long parts are folded; -o yaml shows the whole record
```

Один прогон — всё, что знает его строка в списке, в развёрнутом виде:

```console
$ graphenectl get run watch-demo
run:      watch-demo
pipeline: perf-nightly
status:   Terminated
started:  2026-08-21 11:23:41
took:     1m48s
image:    localhost:7233/default/perf-nightly:4f925b8c6e5fff45
trigger:  manual
labels:   team=perf
```

## Ничего — и нет такого

Список показывает **живые** записи. Пустой ответ говорит об этом,
называет фильтры, которые его сузили (в stderr — stdout остаётся
чистым), и завершается с кодом 0:

```console
$ graphenectl get docker-volume -p ready
No live docker-volume records match phase ready.
```

Kind, которого в инсталляции нет, — ошибка, а не пустое множество:
команда падает и предлагает ближайшие kinds:

```console
$ graphenectl get agnt
graphenectl: unknown kind "agnt" — did you mean agent? (`graphenectl kinds` lists them)
```

Та же граница проведена везде: `get`, `delete`, `events`, `logs`,
`run status`, `run result` и `run cancel` на несуществующую цель отвечают
`no record <ref>` (или `no run <id>`) с ненулевым кодом возврата — и
никогда пустым успехом.

Записи, закончившей свою жизнь, в списке нет, но её по-прежнему можно
прочитать по имени — последние spec и state, с `phase: deleted`:

```console
$ graphenectl get agent vm-e2e
ref:    agent/vm-e2e
phase:  deleted
...
```
