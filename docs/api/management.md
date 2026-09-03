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
| `Tree` | owner ref | recursive ownership tree |
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
| `GetRun` | run id | current execution status |
| `WatchRun` | run id | current status, then transitions to terminal |
| `RunResult` | run id | waits and returns typed result JSON |
| `CancelRun` | run id | requests cancellation with cleanup |
| `RunStatus` | run id | status and pending activities with attempts, failure and heartbeat |

An image makes the run managed: the server launches the worker. Params are
validated against the selected pipeline or revision manifest before start.
List runs through `ResourcesAPI.List` with kind `run`.

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
| `Logs` | ref, follow, since; or admin raw query | log records and dropped counts |
| `Metrics` | ref, time range, follow; or admin PromQL | snapshot JSON, live OTLP, dropped counts |
| `Trace` | ref, follow; or admin Jaeger query | snapshot JSON, live OTLP, dropped counts |

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
