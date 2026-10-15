---
sidebar_position: 12
title: Access and service accounts
sidebar_label: access and accounts
---

# Access and service accounts

Authorization is expressed with ordinary records in the protected
`graphene-system` namespace:

- a `role` groups allowed verb/kind pairs;
- a `rolebinding` grants a role to users, groups, or service accounts in one
  namespace or in all namespaces;
- a `serviceaccount` is a non-human identity whose token can be issued and
  revoked.

The installation provides built-in `admin`, `developer`, `viewer`,
`agent`, and `run` roles. Custom roles use the same record model.

## Inspect the current identity

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

This is the effective answer for the selected context and namespace. Studio uses
the same API to decide which actions to offer; the server still authorizes every
request.

## Create a service account

An administrator can create the record, bind it, and issue a token:

```console
$ graphenectl apply serviceaccount ci-release -n graphene-system \
    --spec '{"description":"release automation"}'
$ graphenectl apply rolebinding ci-release-runner -n graphene-system \
    --spec '{"role":"run","subjects":[{"kind":"sa","name":"ci-release"}],"namespace":"team-a"}'
$ graphenectl account token ci-release --ttl 24h --comment 'release job'
```

The token value is printed once on stdout; status and the token id go to stderr.
Store the value in the calling system's secret store. A zero TTL creates a token
that remains valid until revoked.

The token works on every door of the installation, the plain-HTTP ones
included. The registry (`/v2/<namespace>/<pipeline>/…`, Bearer or Basic with
the token as the password) takes the namespace from the repository path:
pulling an image asks for `get pipeline` there, pushing one for `create
revision` or `update pipeline`; the bare `/v2/` ping needs only a known token,
the catalog is closed to bindings. `/agent/binary` asks for `get agent` in the
namespace named by `X-Graphene-Namespace` (default otherwise). An unknown token
gets `401` with the registry challenge, a known one without the binding `403`.
Prometheus `remote_write` (`/api/v1/write`) stays with run and administrator
tokens: the door does not stamp a namespace on written series.

On the native gRPC door the token opens the worker plane's pipeline and run
surface in the namespace named by `x-graphene-namespace` (default otherwise):
`ManifestAPI.PublishManifest` asks for `create revision` or `update pipeline`,
`GetPipeline` for `get pipeline`, `RunsAPI.StartRun` for `run pipeline`,
`GetRun`, `WatchRun` and `RunResult` for `get run`. The rest of that door — the
Temporal proxy, the agent plane, secrets, blobs, capabilities, OTLP intake —
answers `PERMISSION_DENIED` to a binding: those calls take a run, agent or
administrator token.

Roles, bindings, accounts, token metadata, and their events can be read with
generic verbs. Token values never read back:

```console
$ graphenectl get role -n graphene-system
$ graphenectl get rolebinding -n graphene-system
$ graphenectl get serviceaccount ci-release -n graphene-system
$ graphenectl events serviceaccount ci-release -n graphene-system
```

Token revocation is an `invoke` command exposed by the service-account kind;
use `graphenectl kinds serviceaccount` to inspect its current payload schema
before invoking it.

