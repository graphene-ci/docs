---
sidebar_position: 2
title: Connect to an installation
sidebar_label: Connect
---

# Connect to an installation

A Studio **context** is a named connection containing four values: server,
token, namespace override, and whether a scheme-less address uses plain HTTP.
Contexts let one Studio installation switch between independent Graphene
installations without mixing their state.

## Add a context

Open the context switcher, choose **Add context**, and provide:

| Field | Value |
|---|---|
| Server | `host:port` or a complete `http(s)://` URL. Empty means the same origin that served Studio. |
| Token | A bearer token. An empty token is requested at sign-in instead of being saved. |
| Namespace | An optional override. Leave it empty when the token pins a namespace. |
| Insecure | Enables plain HTTP for a scheme-less address. Use only for a trusted local development stack. |

Studio checks the context and calls `WhoAmI`. A successful check establishes
the principal, available namespace, role, and permissions shown by the UI.
An invalid token, unreachable server, or disallowed namespace leaves the
context unhealthy instead of silently falling back to another installation.

## Storage and trust

The web application stores saved contexts in that browser profile. Treat a
profile containing a token as a credential store: do not save privileged
tokens on shared machines. The desktop build uses the same renderer and public
Management API; it is not a separate trust boundary.

For a remote installation, terminate TLS at the server or a trusted proxy and
use an `https://` address. Plain HTTP exposes the token and all Management API
traffic to the network.

## Namespace and permissions

Changing the selected namespace changes the scope sent to the API; it cannot
grant access the token does not have. Studio derives enabled actions from
`WhoAmI`, while the server authorizes every request independently.

See [Security and access](../operations/security.md) for roles and token scope,
or [Management API protocol](../api/protocol.md) for the headers used on every
request.
