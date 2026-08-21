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
| `-l k=v` | повторяемый | — | селектор по лейблам, каждая пара должна совпасть |
| `-p <слово>` | строка | — | ЕДИНСТВЕННЫЙ фильтр жизненного цикла: фаза записи (`creating`, `ready`, `deleting`, …) для kinds, статус workflow (`Running`, `Completed`, `Terminated`, …) для прогонов |
| `--owner <ref>` | строка | — | записи этого владельца (`run/x`, `stand/p`, `agent/vm-1`) |
| `-w` | bool | выкл | наблюдение: снапшот, дальше только изменения — см. [Формы вывода](outputs.md) |
| `--chunk-size` | int | 500 | размер страницы — см. [Формы вывода](outputs.md) |

Плюс [флаги подключения](common-flags.md) и [формы вывода](outputs.md).

## Примеры

Всё в неймспейсе:

```console
$ graphenectl get all
REF                    PHASE  OWNER  LABELS
pipeline/perf-nightly  ready
agent/vm-e2e           ready         role=e2e,graphene.io/run=run-e2e
```

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
RUN          PIPELINE      STATUS      LABELS
watch-demo   perf-nightly  Terminated
val-c        perf-nightly  Terminated
```

Одна запись целиком — заголовочные поля, затем spec и state
YAML-блоками:

```console
$ graphenectl get pipeline perf-nightly
ref:    pipeline/perf-nightly
phase:  ready
owner:
labels:
spec:
  {}
state:
  concurrency: queue
  digest: sha256:abc82597…
  image: localhost:7233/default/perf-nightly:4f925b8c6e5fff45
  manifest:
    activities:
    - docker.container.remove
    - docker.container.run
    ...
```

Один прогон — его статус:

```console
$ graphenectl get run watch-demo
Terminated
```

Пустой ответ говорит об этом (в stderr — stdout остаётся чистым):

```console
$ graphenectl get docker-volume
No records found.
```
