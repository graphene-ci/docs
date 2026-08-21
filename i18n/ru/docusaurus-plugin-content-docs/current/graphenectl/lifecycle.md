---
sidebar_position: 8
title: "delete, transfer, invoke"
sidebar_label: Глаголы жизненного цикла
---

# delete, transfer, invoke

Глаголы, меняющие жизнь записи. Все три принимают цель как
`<kind> <id>` или `kind/id`.

## delete

```text
graphenectl delete <kind> <id> [--wait]
```

Сигналит удаление: у записи отрабатывает finalize (реальный ресурс
сносится), затем запись доходит до `deleted`. Удаление каскадное:
владеемые дети умирают первыми.

| Флаг | Что делает |
|---|---|
| `--wait` | ждать, пока запись станет `deleted` или исчезнет целиком |

```console
$ graphenectl delete docker-volume cache-v1
docker-volume/cache-v1: deletion signaled
```

```console
$ graphenectl delete docker-volume cache-v1 --wait
docker-volume/cache-v1: deleting...
docker-volume/cache-v1: deleted
```

## transfer

```text
graphenectl transfer <kind> <id> <new-owner> [--keep <длительность>]
```

Владение движется в одну сторону: отдать запись можно, забрать —
нельзя. Передача **стенду** (`stand/<pipelineId>`) — способ ресурса
пережить свой прогон; `--keep` ограничивает срок — собственный таймер
стенда соберёт запись после TTL. Ненулевой `--keep` валиден только для
stand-назначений — в остальные сервер откажет.

| Флаг | Дефолт | Что делает |
|---|---|---|
| `--keep` | `0` (держать до явного удаления) | TTL под новым владельцем, например `72h` |

```console
$ graphenectl transfer docker-volume cache-v1 stand/perf-nightly --keep 72h
docker-volume/cache-v1 -> stand/perf-nightly
```

## invoke

```text
graphenectl invoke <kind> <id> <command> [--data JSON | --data-file f.yaml]
```

Отправляет записи одну из её собственных команд — типизированные
update'ы, которые определил её kind. Payload — запрос команды; ответ —
её результат как JSON.

| Флаг | Что делает |
|---|---|
| `--data` | payload как inline JSON |
| `--data-file` | payload из JSON- или YAML-файла; `-` читает stdin |

Флаги взаимоисключающие; YAML-файл конвертируется в JSON по дороге (то
же соглашение — в [run](run.md)).

```console
$ graphenectl invoke agent vm-1 transfer-owner --data '{"newOwner":"stand/perf-nightly"}'
{}
```

```console
$ graphenectl invoke stand perf-nightly extend --data-file extend.yaml
```
