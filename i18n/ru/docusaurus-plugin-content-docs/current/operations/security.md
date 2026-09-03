---
sidebar_position: 4
title: Модель безопасности
sidebar_label: Безопасность
---

# Модель безопасности

У Graphene одна аутентифицированная дверь сервера, авторизация по namespace и
write-only секреты. Автоматизация машин при этом не становится sandbox.

## Границы доверия

| Граница | Контракт |
|---|---|
| Client → server | Bearer token или пароль registry Basic; TLS завершает front proxy |
| Person → server | OIDC token; Graphene не хранит пароль пользователя |
| Run → server | короткоживущий token конкретного run и namespace |
| Agent → server | token одного agent record и namespace |
| Worker → machine | container агента имеет host-level доступ через `/host` |
| Server → Docker | для managed runs сервер монтирует Docker socket хоста |
| Server → stores | credentials blob, secret и telemetry — секреты инсталляции |

Не публикуйте дверь development Compose: там известные токены, plaintext,
плавающие теги зависимостей и привилегированный Docker socket.

## Авторизация

Право имеет форму `verb × kind × namespace`. Правила аддитивны; deny и ACL
отдельного объекта нет. Subjects: `user:<name>`, `group:<name>`, `sa:<name>`.
Binding выдаёт одну роль в одном namespace или `*`.

Verbs: `get`, `list`, `watch`, `create`, `update`, `delete`, `transfer`,
`invoke`, `run`, `build`, `activate`. Неизвестные verbs и kinds отклоняются при
записи роли.

| Встроенная роль | Доступ |
|---|---|
| `admin` | любой verb на любом kind в namespace binding |
| `developer` | управление pipelines, runs, revisions, triggers, stands, artifacts, Git sources и принесёнными resources; чтение agents/namespaces; чтение имён и запись vars/secrets |
| `viewer` | get, list, watch любого kind |
| `agent` | get, update, invoke agent records; используется credentials агента |
| `run` | resource-работа конкретного рана и read-only discovery pipeline/revision/source |

Значения секретов не возвращаются даже `admin`; права относятся к записи и
каналу ротации. Для CI используйте [service accounts](../graphenectl/access.md),
а отдельные tokens отзывайте командой `revoke-token` их account.

## Секреты

- Код пайплайна передаёт `SecretRef`, а не plaintext.
- Значение разрешается последним ответственным компонентом: сервером для SSH
  install, machine worker для File/Git.
- Mutable store использует AES-GCM под `GRAPHENE_SECRETS_KEY`.
- Ключ нельзя восстановить из store. Храните его backup отдельно и открывайте
  только процессу сервера.
- Temporal history, specs записей и обычный output содержат только имена.

Lifecycle внешнего KMS/Vault не поставляется. Если платформа требует managed
key rotation, текущий secret store ещё не даёт полного production-контура.

## Credentials исходников и webhook

`gitsource.credentialRef` и auth Git-библиотеки называют секреты Graphene.
Checkout не сохраняет credentials в конфигурации репозитория. Webhook должен
объявлять `HookSecret`; он проверяет Bearer либо HMAC-SHA256 точного тела.

## Доступ к машине

Для `runc` агенту нужен root; actions могут менять хост. Выдавайте права записи
и запуска пайплайнов только identity, которым доверяете эти машины. Разделяйте
trust domains разными namespaces и agent identities. PTY — операторский escape
hatch, а не ограниченный application shell; перед выдачей доступа проверьте
`GRAPHENE_AGENT_PTY_USER`.

## Перед любым удалённым размещением

1. Замените все development tokens и storage credentials.
2. Поставьте HTTP/2-capable TLS proxy перед единственной дверью.
3. Настройте OIDC и namespace bindings; проверьте `graphenectl whoami`.
4. Храните secret key отдельно от data volume и определите его backup.
5. Разделите Docker/runtime hosts по своей модели доверия.
6. Проверьте retention telemetry и blobs вне Graphene.

Этот список уменьшает очевидный риск, но не превращает development-дистрибутив
в поддерживаемую production-топологию.
