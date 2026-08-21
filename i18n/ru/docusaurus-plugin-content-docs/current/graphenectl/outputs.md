---
sidebar_position: 4
title: Формы вывода
sidebar_label: Формы вывода
---

# Формы вывода

Каждая читающая команда рендерится одними и теми же флагами. Эта
страница показывает каждую форму один раз, на реальных командах;
остальной гайд пишется дефолтной таблицей и называет другие формы
только там, где они — суть примера.

| Флаг | Значения | Дефолт | Что делает |
|---|---|---|---|
| `-o` | `table` \| `wide` \| `name` \| `json` \| `yaml` | `table` | форма ответа |
| `--jq <expr>` | jq-выражение | — | прогнать JSON-форму через [gojq](https://github.com/itchyny/gojq) |
| `-w` | bool | выкл | наблюдать список: снапшот, дальше только изменения |
| `--chunk-size <n>` | int | `500` | размер страницы списка; страницы идут незаметно; `0` — один непагинированный запрос |

## `-o table` — дефолт

```console
$ graphenectl get run -p Terminated
RUN          PIPELINE      STATUS      LABELS
watch-demo   perf-nightly  Terminated
val-c        perf-nightly  Terminated
```

## `-o wide` — больше колонок

Записи получают счётчик ожидающих команд и метку удаления:

```console
$ graphenectl get pipeline -o wide
REF                    PHASE  OWNER  PENDING  DELETING  LABELS
pipeline/perf-nightly  ready         0        false
```

## `-o name` — только ref'ы, под xargs

```console
$ graphenectl get run -o name
watch-demo
val-c
val-b
```

```console
$ graphenectl get docker-volume -o name | xargs -I{} graphenectl delete {}
```

## `-o json`

Форма protojson, стабильные имена полей:

```console
$ graphenectl get run watch-demo -o json
{
  "status": "Terminated"
}
```

## `-o yaml`

Те же поля через YAML-маппинг:

```console
$ graphenectl get run watch-demo -o yaml
status: Terminated
```

## `--jq` — скриптовая форма

Одно выражение поверх JSON-формы; строки печатаются сырыми (поведение
`jq -r`). На стримах выражение выполняется на каждое сообщение:

```console
$ graphenectl get run --jq '.runs[].runId'
watch-demo
val-c
val-b
```

```console
$ graphenectl pipeline show perf-nightly --jq .image
localhost:7233/default/perf-nightly:4f925b8c6e5fff45
```

```console
$ graphenectl events run demo --jq 'select(.kind == "activity-failed")'
```

## `-w` — наблюдение списка

Первый кадр печатается целиком, дальше только строки, которые
появились, изменились или исчезли (помечаются `deleted`):

```console
$ graphenectl get run -w
RUN          PIPELINE      STATUS      LABELS
watch-demo   perf-nightly  Terminated
demo-2       perf-nightly  Running
demo-2       perf-nightly  Completed
```

`-w` совместим с `-o json` и `--jq`: каждое изменение приходит одним
сообщением.

## `--chunk-size` — пагинация

Списки обходят сервер страницами по `--chunk-size` (дефолт 500) —
незаметно: страницы складываются в один ответ для любой формы вывода,
включая `-w`. `--chunk-size 0` просит всё одним запросом.

```console
$ graphenectl get run --chunk-size 100 -o name | wc -l
1187
```
