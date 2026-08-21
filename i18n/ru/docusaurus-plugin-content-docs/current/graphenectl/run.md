---
sidebar_position: 9
title: run
sidebar_label: run
---

# run

```text
graphenectl run start <pipeline> [флаги]
graphenectl run watch <run-id> [флаги]
graphenectl run result | cancel <run-id>
graphenectl run list [флаги]
```

Глаголы **жизненного цикла** прогона. Чтение прогонов — обычная
грамматика записей: `get run`, `get run <id>`, `events run <id>` — как
kubectl держит `rollout` отдельно от `get`.

## run start

Запускает прогон **уже запушенного** пайплайна. Образ воркера берётся
из записи пайплайна — перезапуску не нужен чекаут исходников. Params
валидируются по манифесту пайплайна **на двери**: битый сабмит падает
сразу, по полям, а не на машине.

| Флаг | Дефолт | Что делает |
|---|---|---|
| `--params <json>` | — | типизированные параметры inline JSON |
| `--params-file <path>` | — | параметры из JSON- или YAML-файла; `-` читает stdin |
| `--run-id <id>` | `<pipeline>-<время>` | имя прогона; тот же id присоединяется, не форкает |
| `--image <ref>` | из записи пайплайна | переопределение образа воркера |
| `-l k=v` | повторяемый | лейблы прогона — тот же язык меток, что у записей |
| `--watch` | выкл | следить за прогоном до конца (см. `run watch`) |

`--params` и `--params-file` взаимоисключающие. YAML-файл
конвертируется в JSON по дороге; длительности принимаются и строками
`"1h"`, и числами-наносекундами.

```console
$ graphenectl run start perf-nightly --params '{"folderId":"f1","zone":"ru-central1-a","keep":"1h", ...}'
run perf-nightly-20260821-112341 started (managed: true)
perf-nightly-20260821-112341
```

```console
$ graphenectl run start perf-nightly --params-file params.yaml --watch
```

Битый сабмит падает словами самого манифеста:

```console
$ graphenectl run start perf-nightly --params '{"zone":123}'
graphenectl: invalid_argument: params do not match the pipeline's manifest:
  folderId: ERROR_CODE_REQUIRED_MISSING (required); zone: ERROR_CODE_TYPE_MISMATCH
```

### Терминальная форма

В терминале `run start` **вообще без параметров** идёт по схеме
параметров пайплайна поле за полем — required переспрашиваются,
опциональные пропускаются пустым ответом, составные принимают JSON:

```console
$ graphenectl run start perf-nightly
params (an empty answer skips an optional field):
  folderId (string, required): f1
  zone (string, required): ru-central1-a
  keep (duration, e.g. 1h30m, required): 45m
  ...
run perf-nightly-20260821-145012 started (managed: true)
```

Вне терминала поведение прежнее (сервер отвергнет отсутствующие
required-поля).

## run watch

```text
graphenectl run watch <run-id> [--plain] [--collapse] [--logs none|tail|all]
```

Живой вид прогона: дерево владения его ресурсов, у каждого узла —
фаза, elapsed, счётчик ретраев, свежие события его history (`⚡`,
ошибки — `✗`) и хвост логов (`·`); внизу — полоса самого прогона. В
терминале панель перерисовывается на месте, последний кадр остаётся на
экране; код выхода отражает терминальный статус.

| Флаг | Дефолт | Что делает |
|---|---|---|
| `--plain` | авто вне терминала | append-лента вместо панели — дружит с grep и CI |
| `--collapse` | выкл | сворачивать `ready`-ресурсы в одну строку |
| `--logs` | `tail` | строк лога на узел: `none`, `tail` (2), `all` |

Панель:

```text
run perf-nightly-20260821-1450   Running   1m42s
│
├─ agent/edge-1                        ready      52s
│   ⚡ capability docker published
│   · docker 27.1.1 installed, daemon up
├─ k8s.vpc…Network/net                 creating   1m40s   ↻ attempt 4
│   ✗ activity-failed  k8s.apply — secret "kubeconfig" not found
│   · ERROR Activity error. ActivityType k8s.apply Attempt 3
└─ docker/nginx                        ready      12s
──────────────────────────────────────────────────────────
run  ⚡ activity-completed run-work @bare-1
     · INFO fan-out complete n=2
```

Та же модель append-лентой:

```console
$ graphenectl run watch perf-nightly-20260821-112341 --plain
14:23:42  run/perf-nightly-20260821-112341 status Running
14:23:42  run/perf-nightly-20260821-112341 ⚡ run-started
14:23:44  run/perf-nightly-20260821-112341 ⚡ activity-scheduled  server.agent.declare
14:23:46  run/perf-nightly-20260821-112341 · INFO  Started Worker ...
```

При успехе типизированный Result печатается в stdout и код выхода 0;
упавший, отменённый или терминированный прогон выходит с 1 и статусом
в ошибке.

## run result

Ждёт прогон и печатает его типизированный Result как JSON:

```console
$ graphenectl run result run-e2e
{"report":"pid=73805","fanOut":1,"baselineDigest":"sha256:..."}
```

## run cancel

Просит прогон остановиться — гарантированная уборка всё равно
отрабатывает (в отличие от жёсткого terminate):

```console
$ graphenectl run cancel perf-nightly-20260821-112341
run perf-nightly-20260821-112341: cancel requested (teardown still runs)
```

## run list

Сахар над `get run` с теми же флагами (`-p`, `-l`, `-w`,
`--chunk-size`):

```console
$ graphenectl run list -p Running
RUN     PIPELINE      STATUS   LABELS
demo-2  perf-nightly  Running  team=perf
```
