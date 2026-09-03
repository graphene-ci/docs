---
sidebar_position: 1
title: Обзор
sidebar_label: Обзор
---

# graphenectl

`graphenectl` — управляющая CLI инсталляции graphene. Она работает с
**записями**: ресурсами и их пятью измерениями, прогонами, секретами,
неймспейсами, контекстами подключения. Позиция и грамматика — как у
kubectl: сначала глагол, потом kind. Собственного закрытого словаря у
клиента нет: доступные kinds и команды он получает из словаря
инсталляции, поэтому completion и формы следуют за сервером без
пересборки клиента.

Чего она сознательно **не** делает: не собирает, не пушит и не
запускает *ваш* пайплайн из исходников. Бинарь пайплайна управляет
своим пайплайном сам — `./your-pipeline push`, `./your-pipeline run` —
через те же контексты подключения. `graphenectl run start` запускает
прогон **уже запушенного** пайплайна: образ воркера берётся из записи
пайплайна, чекаут не нужен.

## Установка

`graphenectl` — один статический бинарь из репозитория graphene:

```console
$ go build -o ~/bin/graphenectl ./cmd/graphenectl
```

## Первое подключение

```console
$ echo $TOKEN | graphenectl login --server graphene.example:7233 --token-stdin
logged in: context graphene.example, role run, namespace team
```

`login` проверяет сервер и токен рукопожатием **до** записи чего-либо,
затем сохраняет контекст и делает его текущим. См.
[Контексты](contexts.md).

Сразу подключите автодополнение — дополняются грамматика, kinds и id,
гадать не придётся (`graphenectl get d<TAB>` предложит `docker`,
`docker-volume`, `docker-network` ещё до появления записей — kinds
берутся из манифестов пайплайнов):

```console
$ source <(graphenectl completion bash)     # zsh и fish: см. Проектные команды
```

## Грамматика

```text
graphenectl <глагол> <kind> [id] [флаги]   # записи
graphenectl <kind>/<id> <измерение> [-f]   # наблюдение от ресурса
graphenectl run <lifecycle-глагол> ...     # жизненный цикл прогона
graphenectl <существительное> <глагол> ... # ctx, secret, source, revision, account
```

Цель-запись пишется двумя словами или одним ref:

```console
$ graphenectl get docker-volume my-vol
$ graphenectl get docker-volume/my-vol     # то же самое
```

Прогон — такая же запись, kind `run`: `get run`, `get run <id>`,
`events run <id>` работают. Под `run` живут только lifecycle-глаголы
(`start`, `watch`, `result`, `cancel`, `list`, `status`) — как kubectl держит
`rollout` отдельно.

## Соглашения

- **stdout — данные, stderr — прогресс.** stdout можно передавать
  дальше по конвейеру; человеческий шум его не загрязняет.
- **Коды выхода**: `0` — успех, `1` — ошибка; терминальный статус
  наблюдаемого прогона отражается в коде выхода.
- **Флаги можно ставить с обеих сторон позиционных аргументов**:
  `graphenectl secret set demo --value x` и
  `graphenectl secret set --value x demo` — одна и та же команда.
- Частые отказы печатают однострочный `hint:` со следующим шагом:

```console
$ graphenectl get namespace
graphenectl: unauthenticated: 401 Unauthorized
  hint: the token was rejected — check `graphenectl ctx show`, or re-run `graphenectl login`
```

## Страницы

| Страница | Что там живёт |
|---|---|
| [Контексты](contexts.md) | `login`, `ctx`, файл конфигурации и цепочка окружения |
| [Флаги подключения](common-flags.md) | `--context`, `--config`, `-n` — на каждой сетевой команде |
| [Формы вывода](outputs.md) | `-o table\|wide\|name\|json\|yaml`, `--jq`, `-w`, `--chunk-size` |
| [get](get.md) | списки записей и чтение одной |
| [Наблюдение](observe.md) | `events`, `logs`, `metrics`, `trace` |
| [tree](tree.md) | дерево владения |
| [Глаголы жизненного цикла](lifecycle.md) | `apply`, `delete`, `transfer`, `invoke`, `kinds` |
| [run](run.md) | запуск и наблюдение прогонов |
| [pipeline и sources](pipeline.md) | исходники, ревизии и активация |
| [secret, var, ns](secret-ns.md) | значения и неймспейсы как записи |
| [Доступ и accounts](access.md) | роли, bindings, service accounts, токены и `whoami` |
| [Shell на агенте](agent.md) | интерактивная диагностика через исходящую сессию агента |
| [Проектные команды](project.md) | `init`, `completion`, `version` |
