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

По умолчанию — читаемая таблица серий; `-o json` печатает стандартный
PromQL range-ответ бекенда как есть, `--jq` выполняется поверх него:

```console
$ graphenectl metrics run logs-test-2
METRIC                      POINTS  LAST
process_cpu_seconds_total   42      3.17
```

```console
$ graphenectl metrics run logs-test-2 -o json
{"status":"success","data":{"resultType":"matrix","result":[...]}}
```

## trace

Таблица спанов по времени старта; `-o json` печатает стандартный
Jaeger JSON, `--jq` — поверх него:

```console
$ graphenectl trace run logs-test-2
START         DURATION  OPERATION                  SERVICE
20:16:07.015  0.1ms     StartActivity:k8s.observe  graphene-pipeline
20:16:07.070  36.6ms    RunActivity:k8s.observe    graphene-pipeline
```

```console
$ graphenectl trace run logs-test-2 --jq '.data[0].spans | length'
128
```

Измерение без настроенного бекенда отвечает внятной ошибкой
`unimplemented`, а не тишиной. Пустое измерение печатает заметку в
stderr (`No log records.`, `No metrics recorded.`) и выходит с кодом
0 — stdout остаётся чистым для пайпов.
