---
sidebar_position: 8
title: "apply, delete, transfer, invoke, kinds"
sidebar_label: Глаголы жизненного цикла
---

# apply, delete, transfer, invoke, kinds

Эти глаголы создают записи, меняют их жизнь и показывают словарь инсталляции.
Цель везде записывается как `<kind> <id>` или `kind/id`.

Клиент не хранит собственный список kinds и команд: он читает его из записей
`kind/*`. Поэтому kind из манифеста пайплайна появляется в completion и
интерактивных формах без пересборки `graphenectl`.

## apply

```text
graphenectl apply <kind> <id> [--spec JSON] [-f file.yaml] [-l k=v]
```

Команда объявляет запись любого declarable kind. Сервер проверяет spec по
схеме kind до запуска workflow.

| Флаг | Что делает |
|---|---|
| `--spec` | объявление как inline JSON |
| `-f, --file` | одно или несколько объявлений из YAML/JSON |
| `-l, --label` | повторяемая label записи |

В терминале `apply <kind> <id>` без spec пошагово спрашивает поля из схемы:

```console
$ graphenectl apply gitsource main
gitsource spec (an empty answer skips an optional field):
  pipelineId (string, required): perf-nightly
  url (string, required): https://github.com/acme/pipelines
  ref (string): main
  subdir (string): full
  runtime (string): go
gitsource/main applied
```

Роли, bindings, service accounts, переменные, namespaces и sources используют
тот же глагол:

```console
$ graphenectl apply role ci-reader --spec '{"rules":[{"verbs":["get","list"],"kinds":["pipeline","run"]}]}'
$ graphenectl apply var yc-zone --spec '{"value":"ru-central1-a"}'
$ graphenectl apply namespace team-b --spec '{"retentionDays":14}'
```

## delete

```text
graphenectl delete <kind> <id> [--wait]
```

Команда сигнализирует удаление. Finalize удаляет реальный ресурс и blobs самой
записи; удаление владельца каскадно проходит детей от листьев к корню. Удаление
`run` отменяет его и даёт ему завершить teardown.

| Флаг | Что делает |
|---|---|
| `--wait` | ждать фазы `deleted` или полного исчезновения записи |

## transfer

```text
graphenectl transfer <kind> <id> <new-owner> [--keep <duration>]
```

Ресурс можно отдать, но нельзя присвоить. Передача в
`stand/<pipelineId>` позволяет пережить run; `--keep` ограничивает этот срок
и допустим только для stand:

```console
$ graphenectl transfer docker-volume cache-v1 stand/perf-nightly --keep 72h
docker-volume/cache-v1 -> stand/perf-nightly
```

## invoke

```text
graphenectl invoke <kind> <id> <command> [--data JSON | --data-file f.yaml]
```

Команда отправляет записи один из глаголов, опубликованных её kind. Payload
проверяет сама запись. Completion и интерактивная форма берут имя команды и
схему из словаря:

```console
$ graphenectl invoke pipeline perf-nightly activate --data '{"revisionId":"a9bf6299f2d5b3b3"}'
{"digest":"sha256:6e803c…","changed":true}

$ graphenectl invoke gitsource main sync
{"treeDigest":"sha256:2a5531…","commit":"4f2b8f98…","generation":2}
```

## kinds

```text
graphenectl kinds [-v]
```

Словарь в читаемом виде. Те же данные доступны как обычные записи:
`get kind` показывает список, `get kind/docker` — origin, declarability,
схемы и число живых записей:

```console
$ graphenectl kinds
KIND            ORIGIN   APPLY  RECORDS  COMMANDS
agent           system   *      1        entity-set-labels
docker          brought         0        entity-set-labels
gitsource       system   *      2        sync, entity-set-labels
pipeline        system   *      2        fire, publish-manifest, activate, entity-set-labels
…
```

`ORIGIN brought` означает, что определение kind живёт в binary пайплайна.
Сервер показывает и маршрутизирует такие записи, но исполняет их команды worker
конкретного run, поэтому вручную объявить их через `apply` нельзя.
