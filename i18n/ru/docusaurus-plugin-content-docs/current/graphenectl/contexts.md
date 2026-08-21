---
sidebar_position: 2
title: Контексты
sidebar_label: Контексты
---

# Контексты

Контекст именует одну инсталляцию: адрес двери, токен, неймспейс.
Контексты живут в одном файле, общем для `graphenectl` **и** каждого
бинаря пайплайна (`push`/`run` резолвятся так же) — репозиторий никогда
не носит токены.

## Цепочка разрешения

Форма kubeconfig, три слоя:

1. **Файл**: `--config <path>`, иначе `$GRAPHENE_CONFIG`, иначе
   `~/.config/graphene/config.yaml` (пишется с правами `0600`).
2. **Контекст**: явный `--context <name>`, иначе `$GRAPHENE_CONTEXT`,
   иначе `current` из файла.
3. **Оверлей полей поверх** — те же wire-имена, что говорят
   воркер-роли: `$GRAPHENE_ADDRESS`, `$GRAPHENE_TOKEN`,
   `$GRAPHENE_NAMESPACE`, `$GRAPHENE_INSECURE`.

С сервером и токеном в окружении **файл не нужен вовсе** —
синтетический контекст называется `env`. Это режим CI:

```console
$ GRAPHENE_ADDRESS=ci:7233 GRAPHENE_TOKEN=$CI_TOKEN graphenectl run list
```

Явно названный контекст обязан существовать — окружение никогда не
маскирует опечатку в `--context`.

## login — настройка одним шагом

```text
graphenectl login --server host:port (--token-stdin | --token <t>)
                  [--name <ctx>] [--namespace <ns>] [--insecure]
                  [--base-image <ref>]
```

| Флаг | Дефолт | Что делает |
|---|---|---|
| `--server` | обязателен | единственная дверь инсталляции, host:port |
| `--token-stdin` | — | читать токен со stdin (предпочтительно: не светится в истории шелла) |
| `--token` | — | токен строкой |
| `--name` | хост сервера | имя контекста |
| `--namespace` | скоуп самого токена | неймспейс работы |
| `--insecure` | выкл | нешифрованное соединение (dev-контуры) |
| `--base-image` | встроенный | базовый образ для self-build воркеров |

`login` делает рукопожатие `Whoami` **до** записи чего-либо: битый
сервер или токен никогда не попадают в файл. Токен с неймспейсом
пинит контекст к своему скоупу; кластерный токен (`*`) уважает ваш
`--namespace`. Контекст становится текущим.

```console
$ echo dev-run-token | graphenectl login --server localhost:7233 --insecure --token-stdin --name demo
logged in: context demo, role run, namespace default
```

## ctx — управление контекстами

```text
graphenectl ctx list | show | current
graphenectl ctx use <name>
graphenectl ctx set <name> --server host:port [--token-stdin] ...
graphenectl ctx delete <name> | rename <old> <new>
```

Каждый глагол уважает `--config`.

### list

```console
$ graphenectl ctx list
   NAME       SERVER          NAMESPACE
*  dev-admin  localhost:7233  default
   dev        localhost:7233  default
```

`*` помечает текущий контекст.

### show — ЭФФЕКТИВНОЕ подключение

`show` печатает то, что команда реально использует: файл **плюс**
оверлеи окружения. Токен печатается маской, всегда:

```console
$ graphenectl ctx show
context   dev-admin
config    /home/me/.config/graphene/config.yaml
server    localhost:7233
namespace default
insecure  true
token     dev-…en
```

### current

Голое имя, для скриптов:

```console
$ graphenectl ctx current
dev-admin
```

### use

```console
$ graphenectl ctx use dev
current context: dev
```

### set — создать или обновить

`set` меняет **только переданные флаги**; обновление сохраняет
остальное. Самый первый контекст файла автоматически становится
текущим; `--use` делает текущим любой.

| Флаг | Что делает |
|---|---|
| `--server` | дверь, host:port (обязателен при создании) |
| `--token-stdin` / `--token` | токен (stdin предпочтительнее) |
| `--namespace` | неймспейс контекста |
| `--insecure` | нешифрованное соединение |
| `--base-image` | базовый образ self-build воркеров (air-gap зеркалирует свой) |
| `--use` | заодно переключиться на него |

```console
$ echo $TOKEN | graphenectl ctx set prod --server prod.example:7233 --token-stdin --namespace team --use
context prod created
```

### delete, rename

```console
$ graphenectl ctx rename prod production
context prod -> production
$ graphenectl ctx delete production
context production deleted
```

Удаление текущего контекста очищает `current` — следующая команда
попросит выбрать.
