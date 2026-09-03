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

