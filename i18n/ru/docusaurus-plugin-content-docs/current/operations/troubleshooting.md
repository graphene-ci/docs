---
sidebar_position: 5
title: Диагностика
sidebar_label: Диагностика
---

# Диагностика

Начинайте с записи, а не с внутренностей Temporal. Короткая
последовательность:

```console
$ graphenectl ctx show
$ graphenectl whoami
$ graphenectl get <kind>/<id> -o yaml
$ graphenectl events <kind>/<id>
$ graphenectl logs <kind>/<id> --tail 100
$ graphenectl tree <kind>/<id>
```

## Не удаётся подключиться или войти

1. Проверьте effective server, namespace и insecure mode через `ctx show`.
2. Проверьте `/healthz` на той же двери.
3. TLS handshake к plaintext dev-стеку требует явного `--insecure`; не
   скрывайте этим флагом сломанный remote TLS.
4. `permission_denied` означает успешную аутентификацию, но отсутствие роли для
   `verb × kind × namespace`. Проверьте `whoami`, roles и bindings.
5. `unauthenticated` означает отсутствующий, истёкший или невалидный token.

## Не работает materialization

```console
$ graphenectl get gitsource/main -o yaml
$ graphenectl events gitsource/main
$ graphenectl revision materialize <pipeline> --source gitsource/main
$ graphenectl events revision/<id>
$ graphenectl logs revision/<id>
```

Проверьте Git URL/ref/subdir, `credentialRef`, commit источника и runtime.
Runtime требует image, build и artifact; toolchain image должен скачиваться
Docker runtime сервера. Build output принадлежит revision record, даже если
наблюдающий client отключился.

## Run завис или повторяется

```console
$ graphenectl run status <run-id>
$ graphenectl run watch <run-id> --plain --logs all
```

`status` показывает pending activity, attempt, последний heartbeat и failure.
Затем проверяйте названный resource. Повторный `Scheduled` без start обычно
означает отсутствие worker на очереди; started activity со старым heartbeat —
потерянный или заблокированный executor.

Отменяйте через `run cancel`, а не hard workflow termination, чтобы сработал
cleanup. At-most-once работа может вернуть `ErrUnknown`: до ручного повтора
проверьте внешнюю систему.

## Agent не становится ready

```console
$ graphenectl get agent/edge-1 -o yaml
$ graphenectl events agent/edge-1
$ journalctl -u graphene-agent -n 200 --no-pager
```

Проверьте доступность `GRAPHENE_AGENT_SERVER` и с хоста, и из executor; scope
токена на тот же id/namespace; наличие `runc`; отсутствие прежней привязки
машины к другому id. `127.0.0.1` для удалённого агента указывает на него самого,
а не сервер.

## Нет logs, metrics или traces

State и events могут работать, потому что приходят из Temporal. Для измерений
3–5 проверьте и ingest, и query URLs сервера. Пустой ingest принимает и теряет
сигнал. Запустите запрос записи с `-f`, затем посмотрите response codes бекенда
в логах сервера, time range и точную entity reference.

## Не завершается deletion

Удаление финализирует детей первыми. Через `tree` найдите первого child в
deleting/failed. Resource на безвозвратно потерянном agent не может выполнить
finalize; автоматического burial пока нет. Сохраните свидетельства до ручной
правки внешнего объекта.

## Development-стек

```console
$ docker compose ps
$ docker compose logs --tail=200 graphene
$ docker compose logs --tail=200 temporal registry minio
$ docker compose config --quiet
```

Сохраняйте один `GRAPHENE_SECRETS_KEY` вместе с data volume. Несовпавший ключ
намеренно ломает startup. На SELinux hosts checked-in Compose использует
`label:disable` для Docker socket mount.
