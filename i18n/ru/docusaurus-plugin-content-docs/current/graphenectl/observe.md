---
sidebar_position: 6
title: "events, logs, metrics, trace"
sidebar_label: Наблюдение
---

# events, logs, metrics, trace

```text
graphenectl events  <kind> <id> [--follow]
graphenectl logs    <kind> <id> [--follow]
graphenectl metrics <kind> <id>
graphenectl trace   <kind> <id>
```

У каждой записи graphene пять измерений; `get` читает первое
(состояние), эти четыре глагола — остальные. Они работают на ЛЮБОЙ
записи — `docker/nginx`, `agent/vm-1`, и на прогонах по голому id
(`events run my-run`).

| Измерение | Глагол | Источник |
|---|---|---|
| 2 — события | `events` | собственная workflow-history записи: плоскость истины |
| 3 — логи | `logs` | телеметрия (лог-бекенд инсталляции) |
| 4 — метрики | `metrics` | телеметрия, стандартный PromQL range-ответ |
| 5 — трасса | `trace` | телеметрия, стандартный Jaeger JSON |

## Флаги

| Флаг | Команды | Что делает |
|---|---|---|
| `--follow` | `events`, `logs` | продолжать стримить новые записи, пока не остановите |

Плюс [флаги подключения](common-flags.md) и [формы вывода](outputs.md)
(`--jq` выполняется на каждое стрим-сообщение).

## events

Собственная история записи, классифицированная, но никогда не
отфильтрованная — внутренняя механика проходит строками `internal-*`
(в табличной форме скрыта, в `-o json` присутствует):

```console
$ graphenectl events run logs-test-2
20:55:55.091  run-started
20:55:57.549  activity-scheduled       server.agent.declare
20:56:03.128  activity-completed       server.agent.declare
20:57:12.331  activity-failed          k8s.apply  @edge-1  error: secret "kubeconfig" not found
```

Посчитать, что падало:

```console
$ graphenectl events run logs-test-2 --jq '.kind' | sort | uniq -c | sort -rn
      6 activity-scheduled
      1 run-terminated
      1 run-started
```

## logs

```console
$ graphenectl logs run logs-test-2
20:55:58.269  INFO  Started Worker Namespace default TaskQueue run/logs-test-2
20:55:58.269  DEBUG ExecuteActivity ... ActivityType k8s.apply
```

Для прогона сюда входит и сырой stdout orchestrator-контейнера — его
тейлит сервер.

## metrics

Стандартный PromQL range-ответ бекенда, как есть — отдавайте тому, кто
рисует:

```console
$ graphenectl metrics run logs-test-2
{"status":"success","data":{"resultType":"matrix","result":[...]}}
```

## trace

Стандартный Jaeger JSON трасс записи:

```console
$ graphenectl trace run logs-test-2
{"data":[{"processes":{"p2":{"serviceName":"graphene-pipeline",...}}}]}
```

Измерение без настроенного бекенда отвечает внятной ошибкой
`unimplemented`, а не тишиной. Пустое измерение (у k8s-записи нет
логов) — нормальный пустой ответ.
