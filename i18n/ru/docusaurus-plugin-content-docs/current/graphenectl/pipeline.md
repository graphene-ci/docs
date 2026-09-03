---
sidebar_position: 10
title: "pipeline, sources, revisions"
sidebar_label: pipeline и исходники
---

# pipeline, sources, revisions

**Пайплайн — это проект**: корень дерева владения, арбитр своих ранов и
держатель версии, которую используют автоматические запуски. Всё под ним —
записи:

```console
$ graphenectl tree pipeline/perf-nightly
pipeline/perf-nightly
  gitsource/nightly-main (ready)
  trigger/perf-nightly.push (ready)
  trigger/perf-nightly.cron (ready)
  revision/perf-nightly.a9bf6299f2d5b3b3 (ready)
```

Сам пайплайн, его источники и ревизии читаются и управляются общими глаголами
`apply`, `get`, `invoke`, `delete`. Под `source` и `revision` остаётся только то,
что эти глаголы не могут переносить: байты и потоки.

## Git-источники

**`gitsource`** — checkout ссылки Git. Файлы доступны для чтения и **не
редактируются**: изменение checkout создало бы собственную ветвь, которую надо
хранить, сравнивать и сливать, а Graphene не является системой контроля версий.
Поток однонаправленный:

```console
$ graphenectl apply gitsource main --spec '{"pipelineId":"perf-nightly","url":"https://github.com/acme/perf.git","ref":"main","subdir":"full","runtime":"go"}'
$ graphenectl invoke gitsource main sync        # снова получить ref
```

`credentialRef` может назвать секрет Graphene для приватного репозитория. В
записи остаётся только имя; значение разрешается во время fetch.

Git-источники в Graphene доступны только для чтения. Studio и
`graphenectl source files/cat` показывают checkout для просмотра. Код
изменяется в исходном репозитории, после движения Git ref вызывается `sync`.

## Загрузка локальных исходников

Локальный каталог можно материализовать, не объявляя source-запись. Это
development-путь `revision materialize --upload`:

```console
$ graphenectl revision materialize perf-nightly --upload ./my-code
```

`graphenectl source upload perf-nightly ./my-code` — низкоуровневый канал
байтов: он сохраняет tarball и печатает ссылку, но сам не создаёт source-запись.

## source — байты

```text
graphenectl source files <kind/id>            # дерево файлов
graphenectl source cat <kind/id> <path>       # прочитать файл
graphenectl source download <kind/id> [-o out.tgz]
graphenectl source upload <pipeline> <dir|file.tgz>
graphenectl source runtimes
```

Источник всегда называется как `kind/id` (`gitsource/main`) — клиент не
угадывает kind по короткому имени. `source runtimes` перечисляет toolchains,
которые умеет собирать эта инсталляция. Go 1.26 встроен; администратор может
явно добавить build runtime, но это не добавляет Graphene SDK для другого
языка.

Каждый успешный Git fetch обновляет resolved commit, digest дерева и generation
записи:

```console
$ graphenectl get gitsource/main -o json --jq .resource.state.generation
4
```

## revision — сборка и draft-run

```text
graphenectl revision materialize <pipeline> [--source kind/id] [--upload dir]
graphenectl revision run <pipeline> <revision> [--params JSON]
```

`materialize` собирает источник в неизменяемую ревизию **на сервере**. Build
является собственным `Init` revision-записи и продолжается после отключения
клиента; команда лишь наблюдает поток прогресса. При одном источнике он
выбирается автоматически, при нескольких сервер требует `--source`.
`--upload` передаёт локальный каталог, не объявляя source.

`run` запускает **draft** любой ревизии, активной или нет, проверяет параметры
по её собственному manifest и выполняет её образ.

**Активация** — команда пайплайна, не глагол ревизии:

```console
$ graphenectl invoke pipeline perf-nightly activate --data '{"revisionId":"a9bf6299f2d5b3b3"}'
```

Запись сама читает manifest из blob store, приводит триггеры и словарь kinds к
нужному состоянию и запоминает `revisionId`. Rollback — активация старой
ревизии. Список ревизий остаётся общей выборкой:

```console
$ graphenectl get revision --owner pipeline/perf-nightly
```
