---
sidebar_position: 6
title: "events, logs, metrics, trace"
sidebar_label: Наблюдение
---

# events, logs, metrics, trace

```text
graphenectl events  <kind> <id> [-f]
graphenectl logs    <kind> <id> [-f]
graphenectl metrics <kind> <id> [-f]
graphenectl trace   <kind> <id> [-f]

graphenectl <kind>/<id> logs -f        # форма от ресурса
```

У каждой записи Graphene пять измерений; `get` читает первое — состояние, а
эти четыре глагола читают остальные. Они работают с любой записью:
`docker/nginx`, `agent/vm-1` и run по голому id. Измерение принадлежит
записи, поэтому запись может стоять первой: `graphenectl pipeline/x logs -f`
эквивалентна `graphenectl logs pipeline/x -f`.

| Измерение | Глагол | Источник |
|---|---|---|
| 2 — события | `events` | собственная workflow history записи: плоскость истины |
| 3 — логи | `logs` | история из log backend, затем live push |
| 4 — метрики | `metrics` | PromQL range snapshot, затем live push |
| 5 — trace | `trace` | Jaeger JSON snapshot, затем live push |

Follow работает push-потоком, не polling. Дверь сервера уже принимает каждый
сигнал workers и агентов, поэтому запись попадает в `-f` сразу при поступлении.
Для логов подписка открывается до чтения истории, а шов дедуплицируется. Медленный
клиент сбрасывает самые старые live entries и получает явный счётчик потерь.

## Флаги

| Флаг | Команды | Что делает |
|---|---|---|
| `-f, --follow` | все четыре | продолжать live stream до остановки |

Также действуют [флаги подключения](common-flags.md) и
[формы вывода](outputs.md); `--jq` выполняется для каждого сообщения потока.

## events

Собственная история записи классифицируется, но не фильтруется. Внутренняя
механика остаётся в JSON как события `internal-*`, хотя таблица их скрывает:

```console
$ graphenectl events run logs-test-2
20:55:55.091  run-started
20:55:57.549  activity-scheduled       server.agent.declare
20:56:03.128  activity-completed       server.agent.declare
20:57:12.331  activity-failed          k8s.apply  @edge-1  error: secret "kubeconfig" not found
```

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

Для run сюда входит stdout orchestrator-контейнера, который читает сервер.

## metrics

По умолчанию печатается таблица серий. `-o json` возвращает стандартный PromQL
range response, а с `-f` после snapshot приходят live points:

```console
$ graphenectl gitsource/main metrics -f
No metrics recorded.
14:57:32.829  graphene.activity = 2
14:57:32.829  graphene.door.invoke = 2
```

```console
$ graphenectl metrics run logs-test-2
METRIC                      POINTS  LAST
process_cpu_seconds_total   42      3.17
```

## trace

Таблица spans сортируется по времени старта; `-o json` печатает стандартный
Jaeger JSON:

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

Измерение без настроенного backend отвечает ошибкой `unimplemented`. Пустое
измерение пишет пояснение в stderr и завершает команду с кодом 0, сохраняя
stdout чистым для pipelines.
