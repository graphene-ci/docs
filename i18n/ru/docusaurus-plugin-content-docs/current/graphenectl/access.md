---
sidebar_position: 12
title: Доступ и service accounts
sidebar_label: доступ и accounts
---

# Доступ и service accounts

Авторизация описывается обычными записями в защищённом namespace
`graphene-system`:

- `role` объединяет разрешённые пары verb/kind;
- `rolebinding` выдаёт роль пользователям, группам или service accounts в
  одном namespace либо во всех;
- `serviceaccount` — нечеловеческая identity, токены которой можно выпускать
  и отзывать.

Инсталляция предоставляет встроенные роли `admin`, `developer`, `viewer`,
`agent` и `run`. Пользовательские роли используют ту же модель записей.

## Проверить текущую identity

```console
$ graphenectl whoami
subject   user:alice
groups    platform
namespace team-a
roles     developer
allowed   18 verb/kind pairs
  get/*
  ...
```

Это эффективный ответ для выбранного контекста и namespace. Studio использует
тот же API, чтобы предлагать доступные действия; сервер всё равно авторизует
каждый запрос.

## Создать service account

Администратор создаёт запись, binding и выпускает токен:

```console
$ graphenectl apply serviceaccount ci-release -n graphene-system \
    --spec '{"description":"release automation"}'
$ graphenectl apply rolebinding ci-release-runner -n graphene-system \
    --spec '{"role":"run","subjects":[{"kind":"sa","name":"ci-release"}],"namespace":"team-a"}'
$ graphenectl account token ci-release --ttl 24h --comment 'release job'
```

Значение токена один раз печатается в stdout; статус и id токена идут в stderr.
Сохраните значение в secret store вызывающей системы. Нулевой TTL создаёт токен,
действующий до явного отзыва.

Токен работает на всех дверях инсталляции, включая plain-HTTP. Registry
(`/v2/<namespace>/<pipeline>/…`, Bearer или Basic с токеном в пароле) берёт
namespace из пути репозитория: pull образа требует `get pipeline` в нём, push —
`create revision` или `update pipeline`; голый ping `/v2/` требует только
известного токена, каталог для bindings закрыт. `/agent/binary` требует
`get agent` в namespace из `X-Graphene-Namespace` (иначе default).
Неизвестный токен получает `401` с challenge registry, известный без binding —
`403`. Prometheus `remote_write` (`/api/v1/write`) остаётся за токенами рана и
администратора: дверь не ставит namespace на записываемые серии.

На нативной gRPC-двери токен открывает поверхность пайплайнов и ранов worker
plane в namespace из `x-graphene-namespace` (иначе default):
`ManifestAPI.PublishManifest` требует `create revision` или `update pipeline`,
`GetPipeline` — `get pipeline`, `RunsAPI.StartRun` — `run pipeline`, `GetRun`,
`WatchRun` и `RunResult` — `get run`. Остальное на этой двери — Temporal-прокси,
агентская плоскость, секреты, blobs, capabilities, приём OTLP — отвечает
binding'у `PERMISSION_DENIED`: эти вызовы требуют токена рана, агента или
администратора.

Роли, bindings, accounts, метаданные токенов и их события читаются общими
глаголами. Значения токенов обратно не выдаются:

```console
$ graphenectl get role -n graphene-system
$ graphenectl get rolebinding -n graphene-system
$ graphenectl get serviceaccount ci-release -n graphene-system
$ graphenectl events serviceaccount ci-release -n graphene-system
```

Отзыв токена — команда `invoke`, которую публикует kind `serviceaccount`.
Перед вызовом посмотрите актуальную схему payload через
`graphenectl kinds serviceaccount`.

