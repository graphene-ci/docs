---
sidebar_position: 1
title: Management API
sidebar_label: Обзор
---

# Management API

Management API — публичная поверхность автоматизации, которой пользуются
`graphenectl` и Studio. Одна дверь сервера обслуживает Connect, gRPC и gRPC-Web
из одного protobuf-контракта.

Используйте generated clients из `proto/management/v1`, а не парсинг output
CLI. Сейчас контракт содержит девять services и 34 methods; они перечислены в
[Методах](management.md). Transport, authentication, errors и streams описаны
в [Протоколе](protocol.md).

## TypeScript-клиент

Каждый релиз сервера публикует в GitHub Packages пакет
`@graphene-ci/management-api` той же версии. GitHub Packages требует токен с
`read:packages` даже для публичных пакетов:

```ini
# .npmrc
@graphene-ci:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

```ts
import { createConnectTransport } from '@connectrpc/connect-web' // или connect-node
import { authInterceptor, createGrapheneClient } from '@graphene-ci/management-api'

const api = createGrapheneClient(
  createConnectTransport({
    baseUrl: 'https://graphene.example.com',
    interceptors: [authInterceptor(() => ({ token, namespace: 'team-a' }))],
  }),
)
const info = await api.namespaces.serverInfo({})
```

`authInterceptor` ставит оба заголовка контекста запроса на каждый вызов;
заголовок, переданный в отдельный вызов, главнее. Сообщения и сервисы
импортируются из `@graphene-ci/management-api/v1/<файл>`, например
`.../v1/runs`.

## Контекст запроса

Каждый запрос передаёт:

```http
Authorization: Bearer <token>
X-Graphene-Namespace: team-a
```

Namespace header опционален. Credential одного namespace действует в нём;
installation-wide admin по умолчанию попадает в `default` и выбирает другой
через header. В целевом namespace авторизация проверяется заново.

Browser-вызовы разрешены с любого origin, но cookies не принимаются, а каждый
не-preflight запрос всё равно требует bearer token.

## Resource-first форма

Большинство доменных объектов — записи с адресом `kind/id`. Create, read, list,
delete, transfer и invoke идут через `ResourcesAPI`; schemas и commands
открываются из записей `kind/<name>`. Dedicated services остаются только для
bytes, streams, значения секрета или токена и данных caller/server.

Так клиент остаётся generic: принесённый пайплайном kind появляется без его
пересборки. Перед своим клиентом прочитайте [Ресурсы](../concepts/resources.md).

## Совместимость

Generated code коммитится в репозитории сервера, а TypeScript-пакет несёт
версию сервера. Опубликованного cross-version окна пока нет; берите client
версии целевого сервера и тестируйте вместе. См. [Совместимость](../operations/compatibility.md).
