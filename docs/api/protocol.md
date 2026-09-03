---
sidebar_position: 3
title: Protocol, streams and errors
sidebar_label: Protocol and errors
---

# Protocol, streams and errors

The checked-in generated handlers serve Connect, gRPC and gRPC-Web. Prefer the
generated client for your language; it carries procedure paths and protobuf
encoding correctly.

## Authentication and namespace

Send `Authorization: Bearer <token>` on every call. An invalid token receives
HTTP 401 before an RPC handler runs. For a valid principal, RPC authorization
uses `verb × kind × namespace`; a refusal is `permission_denied`.

`x-graphene-namespace` selects a namespace. Static scoped tokens may select only
their scope. OIDC and service-account identities are authorized again against
bindings in the requested namespace. `WhoAmI` is the supported capability
discovery call for clients.

## Error codes

| Code | Meaning for a client |
|---|---|
| `invalid_argument` | malformed ref/query/spec/params or conflicting fields; fix request |
| `unauthenticated` | missing or invalid identity; obtain another token |
| `permission_denied` | identity is known but lacks the exact right |
| `not_found` | record, command, source, run, blob or session is absent |
| `already_exists` | identity/name conflicts with an existing object |
| `failed_precondition` | current lifecycle state forbids the operation |
| `aborted` | concurrent durable update conflicted; safe clients may retry |
| `resource_exhausted` | server/backpressure limit; retry with backoff |
| `unavailable` | dependency or transport unavailable; retry with backoff |
| `internal` | server failed outside the caller's contract; preserve details |

Unary and streaming handlers translate the same gRPC status to the equivalent
Connect code. Do not treat a stream ending before its documented terminal
message as success.

## Stream contracts

- `WatchRun` sends the current status first and ends after a terminal status.
- `Events(after_event_id)` uses the Temporal history event id as a stable
  resume cursor.
- `Logs(follow=true)` subscribes before reading history and deduplicates the
  history/live seam.
- `Metrics` and `Trace` send a backend snapshot before live OTLP batches.
- Live telemetry sheds oldest data for a slow consumer and emits a `dropped`
  count instead of blocking producers.
- `Pty` announces `session_id` first and closes the shell when its stream dies.
- `Download`, `DownloadSource` and materialization are server streams; callers
  must drain or cancel them.

## Retry and idempotency

Retry `unavailable`, `resource_exhausted` and `aborted` with bounded exponential
backoff. Reads are safe. `Invoke` accepts `request_id` for deduplication. A
caller-chosen run id attaches to the same run and must never be regenerated on
an uncertain response. Do not blindly retry mutations whose external effect is
unknown.

## Payloads

Raw JSON bytes preserve schemas defined by pipeline and resource kinds. Fetch
`kind/<name>` to obtain spec and command schemas before rendering a form. OTLP
batches are serialized `ExportMetricsServiceRequest` or
`ExportTraceServiceRequest`; snapshots keep the query backend's JSON format.
