---
sidebar_position: 1
title: Management API
sidebar_label: Overview
---

# Management API

The Management API is the public automation surface used by `graphenectl` and
Studio. It serves Connect, gRPC and gRPC-Web from the same server door and the
same protobuf contract.

Use generated clients from `proto/management/v1`; do not scrape CLI output.
The contract currently contains nine services and 34 methods, summarized in
[Methods](management.md). Transport, authentication, errors and stream rules
are in [Protocol](protocol.md).

## TypeScript client

Every server release publishes `@graphene-ci/management-api` of the same
version to GitHub Packages. GitHub Packages requires a token with
`read:packages` even for public packages:

```ini
# .npmrc
@graphene-ci:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

```ts
import { createConnectTransport } from '@connectrpc/connect-web' // or connect-node
import { authInterceptor, createGrapheneClient } from '@graphene-ci/management-api'

const api = createGrapheneClient(
  createConnectTransport({
    baseUrl: 'https://graphene.example.com',
    interceptors: [authInterceptor(() => ({ token, namespace: 'team-a' }))],
  }),
)
const info = await api.namespaces.serverInfo({})
```

`authInterceptor` sends both request-context headers on every call; a header
passed to a single call takes precedence. Messages and services are imported
from `@graphene-ci/management-api/v1/<file>`, for example `.../v1/runs`.

## Request context

Every request sends:

```http
Authorization: Bearer <token>
X-Graphene-Namespace: team-a
```

The namespace header is optional. A namespace-scoped credential acts in its own
namespace; an installation-wide admin defaults to `default` and uses the header
to select another. Authorization is checked again in the target namespace.

Browser calls may come from any origin, but cookies are not accepted and every
non-preflight call still needs a bearer token.

## Resource-first shape

Most domain objects are records addressed as `kind/id`. Create, read, list,
delete, transfer and invoke go through `ResourcesAPI`; schemas and commands are
discovered from `kind/<name>` records. Dedicated services exist only for bytes,
streams, a secret value, a token value, and caller/server information.

This keeps clients generic: a pipeline-brought kind appears without rebuilding
the client. Read [Resources](../concepts/resources.md) before implementing a
custom client.

## Compatibility

Generated code is committed in the server repository, and the TypeScript
package carries the server version. There is no published cross-version
compatibility window yet; use the client of the target server version and test
them together. See
[Compatibility](../operations/compatibility.md).
