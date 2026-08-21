---
sidebar_position: 10
title: pipeline
sidebar_label: pipeline
---

# pipeline

```text
graphenectl pipeline show <pipeline-id>
```

Читает запись пайплайна: текущий образ воркера, digest манифеста и сам
манифест — то, чем бинарь ЯВЛЯЕТСЯ, как это опубликовал его последний
`push` (и обновляет каждый старт воркера, с дедупликацией по
содержимому).

```console
$ graphenectl pipeline show perf-nightly
pipeline perf-nightly
image    localhost:7233/default/perf-nightly:4f925b8c6e5fff45
digest   sha256:1fd08944b517…
manifest {"pipelineId":"perf-nightly","paramsSchema":{...},"activities":[...],"kinds":[...]}
```

Скриптовые формы:

```console
$ graphenectl pipeline show perf-nightly --jq .image
localhost:7233/default/perf-nightly:4f925b8c6e5fff45
```

Запись — обычная сущность: её история версий — её собственный лог
событий:

```console
$ graphenectl get pipeline perf-nightly     # запись со spec/state
$ graphenectl events pipeline perf-nightly  # каждая публикация манифеста
```
