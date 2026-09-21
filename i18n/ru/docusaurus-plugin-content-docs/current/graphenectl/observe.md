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

Собственная история записи классифицируется, но ничего не отбрасывает.
Внутренняя бухгалтерия Temporal (`internal-*`: workflow tasks, таймеры) —
большая часть истории и ничего из её сюжета: вид по умолчанию её опускает
и сообщает, сколько строк скрыто; `-o wide` её печатает, `-o json` несёт
её всегда.

```console
$ graphenectl events run logs-test-2
20:55:55.091  run-started
20:55:57.549  activity-scheduled   server.agent.declare
20:56:03.128  activity-completed   server.agent.declare
20:57:12.331  activity-failed      k8s.apply  @edge-1  secret "kubeconfig" not found
… 41 internal events hidden; -o wide shows them
```

В терминале kind окрашен по исходу: scheduled и started — жёлтым,
completed — зелёным, failed и timed out — красным, canceled — фиолетовым.

Подсчитать, что упало:

```console
$ graphenectl events run logs-test-2 --jq '.kind' | sort | uniq -c | sort -rn
      6 activity-scheduled
      1 run-terminated
      1 run-started
```

## logs

```console
$ graphenectl logs run logs-test-2
20:55:58.269  INF  Started Worker Namespace default TaskQueue run/logs-test-2
20:55:58.269  DBG  ExecuteActivity ... ActivityType k8s.apply
20:56:41.002  INF  infra-tests │ 3 passed in 7.80s
20:57:12.331  ERR  secret "kubeconfig" not found
```

Каждая строка — время, трёхбуквенный уровень (`DBG` `INF` `WRN` `ERR`),
источник, который библиотека проставила на записи — имя docker job, — и
тело. Предупреждение жёлтое, а ошибка красная **строкой целиком**: в
потоке вывода они не должны выглядеть как всё остальное. `-o wide`
дописывает все атрибуты записи.

Для run сюда входит собственный stdout orchestrator-контейнера — сырая
внутренность worker, которую читает сервер.

## metrics

По умолчанию печатается таблица серий с линией тренда; `-o wide` рисует
каждую серию графиком; `-o json` возвращает стандартный PromQL range
response как есть, `--jq` выполняется поверх него. С `-f` после snapshot
приходят live points по мере прохождения через коллектор:

```console
$ graphenectl gitsource/main metrics -f
No metrics recorded.
14:57:32.829  graphene.activity = 2
14:57:32.829  graphene.door.invoke = 2
```

```console
$ graphenectl metrics run logs-test-2
METRIC                         N    VALUE      MIN      MAX  TREND     SERIES
docker.container.memory.bytes  3  68.6MiB  68.6MiB  70.5MiB  ▄██▁      activity=docker.container.observe agent=db-1
graphene.activity.seconds      2    9.46s    4.05s    9.46s  ▁████     activity=docker.job agent=db-1
                               2   38.86s   14.59s   38.86s  ▁▁▁▁█     activity=docker.job agent=runner-1
stroppy.iterations_per_second        2493     2493     2493  ▁         activity=publish-metrics agent=runner-1
```

Как читать строку:

- метрика называется один раз, её серии идут ниже;
- `SERIES` — набор лейблов без шума: лейблы, общие для всех строк одной
  записи (run, контур), и префикс `graphene.` отброшены;
- **гистограмма** сворачивается в одну строку: `N` — число наблюдений,
  `VALUE` — их среднее, а тренд — это среднее во времени;
- единица берётся из имени метрики, по соглашению самого OTel:
  `…seconds` читается как длительность, `…bytes` — в двоичных единицах,
  `…percent` — со знаком `%`.

```console
$ graphenectl metrics run logs-test-2 -o wide
docker.container.memory.bytes (average)  activity=docker.container.observe agent=db-1
70.5MiB ┤                  ██████████████████
        ┤                  ██████████████████
69.6MiB ┤▂▂▂▂▂▂▂▂▂▂▂▂▂▂▂▂▂▂██████████████████
        ┤████████████████████████████████████
        ┤████████████████████████████████████
68.6MiB ┤████████████████████████████████████▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁
         13:09:36                                      13:10:30
```

```console
$ graphenectl metrics run logs-test-2 -o json
{"status":"success","data":{"resultType":"matrix","result":[...]}}
```

## trace

Водопад: каждый trace — дерево spans по родству, и у каждого span своя
полоса на общей шкале времени — где в trace он находился и сколько
длился. Упавший span красный. `-o json` печатает стандартный Jaeger
JSON, `--jq` выполняется поверх него:

```console
$ graphenectl trace run logs-test-2
trace 22913539a7ae5e371090460ae51607fd  13:10:15.510  1.58s
StartActivity:server.artifact.declare · graphene-pipeline      100µs  ▏       ━
└─ RunActivity:server.artifact.declare · graphene-pipeline     1.08s  ▏        ━━━━━━━━━━━━━━━━━━━━━━━━━━━
StartActivity:publish-metrics · graphene-pipeline              146µs  ▏                                       ━
└─ RunActivity:publish-metrics · graphene-pipeline            20.9ms  ▏                                       ━
```

Span, слишком короткий, чтобы быть видимым в масштабе trace, всё равно
получает одну ячейку — он был.

```console
$ graphenectl trace run logs-test-2 --jq '.data[0].spans | length'
128
```

Измерение без настроенного backend отвечает ясной ошибкой
`unimplemented`, а не молчанием. Пустое измерение существующей записи
пишет пояснение в stderr (`agent/db-1 has no log records.`, `No metrics
recorded.`) и завершает команду с кодом 0 — stdout остаётся чистым для
пайпов. Несуществующая запись — это `no record <ref>` и код возврата 2.
