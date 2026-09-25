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
| `--query <expr>` | logs, metrics, trace | свой запрос на языке backend, вычисляемый **внутри записи** (ниже) |
| `--start`, `--end` | logs, metrics | окно: RFC3339 или «столько назад» (`-2h`, `-10m`) |
| `--step <dur>` | metrics | шаг range-запроса (`30s`, `1m`); по умолчанию диапазон/200, не меньше 15 с; не больше 11 000 точек на серию |
| `--limit <n>` | logs | записей на страницу (по умолчанию 1000, не больше 10 000) |
| `--desc` | logs | новые сначала |
| `--page <token>` | logs | продолжить с токена, который напечатала прошлая страница |
| `--severity`, `--stream`, `--agent`, `--entity`, `--text` | logs | фильтры, через AND: уровни (повторяемый), поток job, агент-источник, запись, о которой строка, текст в теле |
| `--facets <fields>` | logs | посчитать значения этих полей в выборке вместо списка строк |
| `--traces <n>` | trace | трейсов в snapshot (по умолчанию 20) |

### Две формы запроса

Каждое измерение принимает запрос на языке своего backend — LogsQL,
PromQL, параметры поиска Jaeger — в двух формах, различающихся тем, **чей
это вопрос**:

- **Raw** — запрос сам по себе, без записи: `graphenectl metrics 'rate(...)'`.
  Всё хранилище, поверхность администратора.
- **Scoped** — запрос вместе с записью: `graphenectl metrics run x --query
  'rate(stroppy_ops_total[1m])'`. Тот же язык, но дверь накладывает на него
  скоуп записи — её namespace, метки корреляции, момент рождения — так, что
  выражению из него не вырваться: фильтр LogsQL заключён в скобки внутри
  скоупа, к выражению PromQL backend применяет скоуп на каждом селекторе и
  подзапросе, у параметров Jaeger теги скоупа сильнее пользовательских.
  Авторизуется как любое чтение записи — администратор не нужен.

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

**Веха**, которую поставил пайплайн (`obs.Event`), — событие kind `note`:
subject — имя вехи, input — payload. `--kind` оставляет только названные
kinds (повторяемый) и фильтрует на сервере — десяток вех длинного прогона
читается без всей его history:

```console
$ graphenectl events run nightly-0917 --kind note
14:10:02.118  note                 bench.started  {"vus":4}
14:11:11.795  note                 stand.kept  {"root":"agent/db-1","keep":"2h"}
```

Подсчитать, что упало:

```console
$ graphenectl events run logs-test-2 --jq '.kind' | sort | uniq -c | sort -rn
      6 activity-scheduled
      1 run-terminated
      1 run-started
```

## logs

**Выборка**, а не хвост: окно, страница, фильтры. Записи идут от старых к
новым (`--desc` — новые сначала), по одной странице; страницу закрывает
строка в stderr — сколько пришло и, если в выборке есть ещё, токен
продолжения; одинаковые timestamp между страницами не теряются.

```console
$ graphenectl logs run nightly-0917 --severity WARN,ERROR --stream stderr --start -30m --limit 200
14:11:06.800  WRN  infra-tests │ job infra-tests exited with status 1
14:11:08.891  ERR  bench │ connection refused
… 200 of more; next page: --page MTc5MDA...
$ graphenectl logs run nightly-0917 --query 'level:error AND _msg:~"timeout.*pg"'
$ graphenectl logs run nightly-0917 --facets severity,job
FIELD     VALUE        RECORDS
severity  INFO              61
          WRN                2

job       infra-tests       58
          bench              5
```

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

У вывода инструмента своей важности нет — pytest, компилятор, shell-скрипт
записываются одним уровнем. Там уровень остаётся тем, что сказал источник,
а размечаются **говорящие слова**: `FAILED`, `ERROR`, `Traceback`,
`2 failed` — красным, `WARNING`, `3 warnings` — жёлтым, `PASSED`,
`3 passed` — зелёным, а пояснение pytest `E   …` — красным целиком.

Для run сюда входит собственный stdout orchestrator-контейнера — сырая
внутренность worker, которую читает сервер.

## metrics

По умолчанию печатается таблица серий с линией тренда; `-o wide` рисует
каждую серию графиком; `-o json` возвращает стандартный PromQL range
response как есть, `--jq` выполняется поверх него. С `-f` после snapshot
приходят live points по мере прохождения через коллектор. `--step` задаёт
шаг; `--query` вычисляет ваш PromQL внутри записи — включая нативные
метрики инструмента (`stroppy_*`), в каком бы написании метки корреляции
ни лежали в хранилище:

```console
$ graphenectl metrics run nightly-0917 --query 'rate(stroppy_ops_total[1m])' --step 30s --start -1h
```

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

## Что значит ответ

Дверь отвечает **кодом**, а не молчанием и не одним текстом:

| Ответ | Значит |
|---|---|
| записи, затем строка страницы в stderr | выборка; `… N of more` называет токен следующей страницы |
| `<ref> has no log records in this selection.`, код 0 | запись есть, выборка пуста |
| `no record <ref>`, код 2 | такой записи нет |
| `invalid_argument` | неверен запрос, шаг или фильтр — дальше слова самого backend |
| `unavailable` | backend не ответил или ответил 5xx |
| `unimplemented` | за измерением нет backend, либо scoped-PromQL на backend без `extra_filters` |
| `permission_denied` | токену нельзя читать запись, или raw-поверхность запросил не администратор |
| `... N lines dropped` в stderr | follow сбросил строки медленному потребителю |
