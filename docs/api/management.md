---
sidebar_position: 2
title: Management API methods
sidebar_label: Methods
---

# Management API methods

Fields named `spec`, `state`, `payload`, `params`, `result`, and `manifest` are
JSON carried as protobuf bytes. Record refs always use `kind/id`.

## ResourcesAPI

| Method | Request | Result |
|---|---|---|
| `List` | selector or query, page size/token | resource snapshot and next token |
| `Count` | selector or query; optional group by status | total and status groups |
| `CountOwned` | up to 100 owner refs | live child count per owner |
| `Get` | `ref` | complete record, including closed records |
| `GetMany` | up to 100 refs | the complete records in one call; refs that do not exist are listed in `missing`, not failed on |
| `Tree` | owner ref, `include_deleted` | recursive ownership tree; a run's tree always includes its deleted records, any other owner's on request; every node carries the record's `flows` |
| `Delete` | `ref` | waits for child-first finalize |
| `Transfer` | `ref`, new owner, optional keep seconds | gives the whole subtree away |
| `Invoke` | `ref`, command, JSON payload, optional request id | JSON command result |
| `Apply` | kind, id, JSON spec, labels | declared record ref |
| `Download` | `ref` | byte stream or not-found when no blob exists |

`List` accepts either the structured selector (`kind`, `phase`, `owner`, exact
labels) or a query string, never both. Query fields are `kind`, `id`, `phase`,
`owner`, `pipeline`, `started`, `finished`, and `label.<key>`. Continue only
with the opaque `next_page_token` returned by the previous page.

System-owned label keys under `graphene.io/` cannot be supplied by users.
`Invoke.request_id` deduplicates retries; when omitted, the server generates
one.

## RunsAPI

| Method | Request | Result |
|---|---|---|
| `StartRun` | run id, pipeline, params, optional image and labels | workflow ids |
| `GetRun` | run id | the run's phase |
| `WatchRun` | run id | current status, then transitions to terminal |
| `RunResult` | run id | waits and returns the run's state: `result` (partial for a run that failed) and `error` |
| `CancelRun` | run id | requests cancellation with cleanup |
| `RunStatus` | run id | phase and pending activities with attempts, failure and heartbeat |

An image makes the run managed: the server launches the worker. Params are
validated against the selected pipeline or revision manifest before start.
List runs through `ResourcesAPI.List` with kind `run`.

Phases are one lowercase vocabulary for runs and records alike: a run is
`running`, `completed`, `failed`, `canceled`, `terminated` or `timed-out`;
a record `creating`, `ready`, `updating`, `deleting`, `deleted` or
`failed`. A selector's `phase=` speaks the same words; `phase=deleted`
lists records that finished their life (as far back as retention).

A closed run's `state` is what its close left: `{result}` when it
completed, `{error, result}` when it did not — the pipeline closes a
failed run with the partial result in the failure's details, and the
door reads it back. `RunResult` returns the same two fields.

`ObserveAPI.Events` takes `kinds` to filter on the server; a milestone a
pipeline emitted through `EventsAPI.Emit` arrives as kind `note` with the
milestone's name as `subject` and its payload as `input`.

## RevisionsAPI

| Method | Request | Result |
|---|---|---|
| `Materialize` | pipeline plus tar.gz bytes or source ref | stages `upload`, `runtime`, `build`, `describe`, `publish`, `done` |
| `RunRevision` | pipeline, revision, run id, params, labels | workflow ids for a draft run |

Materialization survives client disconnect because the revision record owns the
build. The final `done` event contains revision id, image and manifest.

## SourceAPI

| Method | Request | Result |
|---|---|---|
| `UploadSource` | pipeline id and tar.gz | location and digest |
| `DownloadSource` | source ref | tar.gz byte stream |
| `ListRuntimes` | empty | configured names, versions, images and default |
| `ListFiles` | source ref | paths, sizes and tree digest |
| `ReadFile` | source ref and path | file bytes |

Files are read-only. Source mutation is a Git ref movement followed by the
record's `sync` command.

## ObserveAPI

| Method | Request | Stream/result |
|---|---|---|
| `State` | ref | workflow status and entity record when applicable |
| `Events` | ref, cursor, follow, optional activity id | classified complete history with raw event |
| `Logs` | ref; since/until, limit, order, page_token, severities, stream, agent, entity, text; `query` — LogsQL inside the record (balanced, no pipe; not with follow), or raw without ref (admin) | records, dropped counts, a closing `page{returned, truncated, next_page_token}`; the fields apply to the live tail as to the history |
| `LogFacets` | a Logs selection, fields, limit | per field, its values with record counts |
| `Metrics` | ref, time range, step_seconds, follow; `query` — PromQL inside the record (backend `extra_filters`), or raw without ref (admin) | snapshot JSON, live OTLP, dropped counts |
| `Trace` | ref, follow, limit; `query` — Jaeger params inside the record, or raw without ref (admin) | snapshot JSON, live OTLP, dropped counts |

Errors are codes: `INVALID_ARGUMENT` for a query, step or filter the door
or the backend refuses (4xx), `UNAVAILABLE` for a backend that did not
answer or answered 5xx, `UNIMPLEMENTED` for a dimension without a backend
or a scoped PromQL query on a backend without `extra_filters`,
`PERMISSION_DENIED` for a token that may not read the record or asked for
the raw surface without being an administrator. An empty selection is
`OK` with a page of zero records.

Raw backend queries are admin-only and ignore record/follow fields. Live
metrics and traces are serialized standard OTLP export requests.

## AgentsAPI

| Method | Request | Result |
|---|---|---|
| `Pty` | agent id, columns, rows | opened session id, raw output, final exit |
| `PtyInput` | session id plus data, resize or close | acknowledgement |

PTY is deliberately mortal: the shell closes with stream cancellation, agent
disconnect, explicit close, or process exit. It does not reconnect.

## NamespacesAPI, RbacAPI, SecretsAPI

| Service.method | Request | Result |
|---|---|---|
| `NamespacesAPI.ServerInfo` | empty | version and component health |
| `RbacAPI.IssueToken` | account, TTL seconds, comment | token id, one-time value, expiry |
| `RbacAPI.WhoAmI` | empty | subject, groups, namespace, roles, allowed pairs, cluster-wide flag |
| `SecretsAPI.SetSecret` | name and value | new version counter |

Namespace, role, rolebinding, serviceaccount, var and secret metadata remain
ordinary records. Token and secret values use dedicated methods because a
record command would persist its payload or result in history.
