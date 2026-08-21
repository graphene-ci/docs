---
sidebar_position: 1
title: Обзор
sidebar_label: Обзор
---

# graphenectl

`graphenectl` — управляющая CLI инсталляции graphene. Она работает с
**записями**: ресурсами и их пятью измерениями, прогонами, секретами,
неймспейсами, контекстами подключения. Позиция и грамматика — как у
kubectl: сначала глагол, потом kind.

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

## Грамматика

```text
graphenectl <глагол> <kind> [id] [флаги]   # записи
graphenectl run <lifecycle-глагол> ...     # жизненный цикл прогона
graphenectl <существительное> <глагол> ... # ctx, secret, ns, pipeline
```

Цель-запись пишется двумя словами или одним ref:

```console
$ graphenectl get docker-volume my-vol
$ graphenectl get docker-volume/my-vol     # то же самое
```

Прогон — такая же запись, kind `run`: `get run`, `get run <id>`,
`events run <id>` работают. Под `run` живут только lifecycle-глаголы
(`start`, `watch`, `result`, `cancel`, `list`) — как kubectl держит
`rollout` отдельно.

## Соглашения

- **stdout — данные, stderr — прогресс.** stdout можно передавать
  дальше по конвейеру; человеческий шум его не загрязняет.
- **Коды выхода**: `0` — успех, `1` — ошибка (терминальный статус
  наблюдаемого прогона отражается в коде выхода), `2` — ошибка
  использования.
- **Флаги можно ставить с обеих сторон позиционных аргументов**:
  `graphenectl secret set demo --value x` и
  `graphenectl secret set --value x demo` — одна и та же команда.
- Частые отказы печатают однострочный `hint:` со следующим шагом:

```console
$ graphenectl ns list
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
| [Глаголы жизненного цикла](lifecycle.md) | `delete`, `transfer`, `invoke` |
| [run](run.md) | запуск и наблюдение прогонов |
| [pipeline](pipeline.md) | запись пайплайна |
| [secret, ns](secret-ns.md) | секреты и неймспейсы |
| [Проектные команды](project.md) | `init`, `completion`, `version` |
