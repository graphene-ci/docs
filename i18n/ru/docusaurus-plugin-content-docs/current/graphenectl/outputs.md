---
sidebar_position: 4
title: Формы вывода
sidebar_label: Формы вывода
---

# Формы вывода

Каждая читающая команда рендерится одними и теми же флагами. Эта
страница показывает каждую форму один раз, на реальных командах;
остальной гайд пишется дефолтной таблицей и называет другие формы
только там, где они — суть примера.

| Флаг | Значения | Дефолт | Что делает |
|---|---|---|---|
| `-o, --output` | `table` \| `wide` \| `name` \| `json` \| `yaml` | `table` | форма ответа |
| `--color` | `auto` \| `always` \| `never` | `auto` | оформление; `auto` включено в терминале и выключено в пайпе, в файле и при заданном `NO_COLOR` |
| `--jq <expr>` | jq-выражение | — | прогнать JSON-форму через [gojq](https://github.com/itchyny/gojq); подразумевает JSON |
| `-w, --watch` | bool | выкл | наблюдать список: снапшот, дальше только изменения |
| `--chunk-size <n>` | int | `500` | размер страницы списка; страницы идут незаметно; `0` — один непагинированный запрос |

## `-o table` — дефолт

```console
$ graphenectl get run -p terminated
RUN         PIPELINE      STATUS      STARTED    TOOK   LABELS
watch-demo  perf-nightly  terminated  2h14m ago  1m48s  team=perf
val-c       perf-nightly  terminated  1d3h ago   42s
```

Строки идут в стабильном порядке — записи по ref, прогоны от новых к
старым, — а лейблы в порядке ключей. Колонка `LABELS` показывает лейблы,
заданные человеком; собственные лейблы инсталляции (`graphene.io/…`:
образ, триггер, прогон) видны с `-o wide` и в `json`/`yaml`.

## `-o wide` — больше колонок

Записи получают счётчик ожидающих команд и метку удаления, а `LABELS`
несёт и собственные лейблы инсталляции:

```console
$ graphenectl get agent -o wide
REF           PHASE  OWNER        AGE    PENDING  DELETING  LABELS
agent/vm-e2e  ready  run/run-e2e  3m12s  0        false     graphene.io/run=run-e2e,role=e2e
```

## `-o name` — только ref'ы, под xargs

```console
$ graphenectl get run -o name
watch-demo
val-c
val-b
```

```console
$ graphenectl get docker-volume -o name | xargs -I{} graphenectl delete {}
```

## `-o json`

Форма protojson, стабильные имена полей. Bytes-поля, несущие JSON по
контракту — `spec` и `state` записи, `manifest` пайплайна,
`params`/`result` прогона, payload'ы событий — декодируются в
настоящие объекты, а не в base64, который печатал бы protojson:

```console
$ graphenectl get run watch-demo -o json
{
  "status": "terminated"
}
```

## `-o yaml`

Те же поля через YAML-маппинг:

```console
$ graphenectl get run watch-demo -o yaml
status: terminated
```

## `--jq` — скриптовая форма

Одно выражение поверх JSON-формы; строки печатаются сырыми (поведение
`jq -r`). На стримах выражение выполняется на каждое сообщение.
Встроенные поля уже декодированы — путь достаёт их напрямую:

```console
$ graphenectl get pipeline perf-nightly --jq '.resource.state.manifest.kinds'
["docker","docker-network","docker-volume"]
```

```console
$ graphenectl get run --jq '.runs[].runId'
watch-demo
val-c
val-b
```

```console
$ graphenectl get pipeline/perf-nightly --jq .resource.state.image
localhost:7233/default/perf-nightly:4f925b8c6e5fff45
```

```console
$ graphenectl events run demo --jq 'select(.kind == "activity-failed")'
```

## `-w` — наблюдение списка

Первый кадр печатается целиком, дальше только строки, которые
появились, изменились или исчезли (помечаются `deleted`). Наблюдение
сообщает об изменениях, поэтому колонки, которые тикают сами (`AGE`,
`STARTED`, `TOOK`), в него не входят:

```console
$ graphenectl get run -w
RUN          PIPELINE      STATUS      LABELS
watch-demo   perf-nightly  terminated
demo-2       perf-nightly  running
demo-2       perf-nightly  completed
```

`-w` совместим с `-o json` и `--jq`: каждое изменение приходит одним
сообщением.

## `--chunk-size` — пагинация

Списки обходят сервер страницами по `--chunk-size` (дефолт 500) —
незаметно: страницы складываются в один ответ для любой формы вывода,
включая `-w`. `--chunk-size 0` просит всё одним запросом.

```console
$ graphenectl get run --chunk-size 100 -o name | wc -l
1187
```

## Цвет

graphenectl — это обычный текст: экран не захватывается, любой вид
передаётся в пайп, грепается и прокручивается. В терминале он оформлен
по **смыслу**:

| Цвет | Значит |
|---|---|
| зелёный | в порядке — `ready`, `completed`, завершённая активность |
| жёлтый | в движении — `creating`, `running`, повторная попытка, предупреждение |
| красный | плохо — `failed`, `timed-out`, строка ошибки |
| фиолетовый | останавливается — `deleting`, `canceled`, `terminated` |
| серый | закончилось или второстепенно — `deleted`, префикс kind, лейблы, оси |

Цвет — свойство места назначения, поэтому скрипту не приходится вырезать
escape-коды: в пайпе и в файле их нет. `--color always` включает
оформление принудительно (для `less -R`), `--color never` или
`NO_COLOR=1` выключает его. Используются только восемь базовых цветов —
они следуют теме терминала.

Таблица вписывается в терминал, обрезая свою единственную неограниченную
колонку (лейблы, серии метрики) и помечая обрез знаком `…`; в пайпе
ничего не обрезается.

## Коды возврата

| Код | Значит |
|---|---|
| `0` | сделано — включая пустой ответ о том, что существует |
| `1` | команда не удалась: неверный флаг, отклонённый запрос, сеть |
| `2` | такого нет: `no record <ref>`, `no run <id>` |
| `3` | команда отработала, а **прогон** — нет: `run start --watch` и `run watch` прогона, который закончился иначе, чем `completed` |
