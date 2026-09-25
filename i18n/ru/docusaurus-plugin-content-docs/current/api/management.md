---
sidebar_position: 2
title: Методы Management API
sidebar_label: Методы
---

# Методы Management API

Поля `spec`, `state`, `payload`, `params`, `result`, `manifest` — JSON внутри
protobuf bytes. Ref записи всегда имеет форму `kind/id`.

## ResourcesAPI

| Метод | Request | Result |
|---|---|---|
| `List` | selector или query, page size/token | snapshot ресурсов и следующий token |
| `Count` | selector или query; optional group by status | total и группы status |
| `CountOwned` | до 100 owner refs | число live children каждого owner |
| `Get` | `ref` | полная запись, включая закрытую |
| `GetMany` | до 100 refs | полные записи одним вызовом; несуществующие перечислены в `missing`, а не роняют вызов |
| `Tree` | owner ref, `include_deleted` | рекурсивное дерево владения; дерево прогона всегда включает его удалённые записи, другого владельца — по запросу; каждый узел несёт `flows` записи |
| `Delete` | `ref` | ждёт child-first finalize |
| `Transfer` | `ref`, new owner, optional keep seconds | отдаёт всё поддерево |
| `Invoke` | `ref`, command, JSON payload, optional request id | JSON result команды |
| `Apply` | kind, id, JSON spec, labels | ref объявленной записи |
| `Download` | `ref` | byte stream либо not-found без blob |

`List` принимает либо structured selector (`kind`, `phase`, `owner`, точные
labels), либо query string, но не оба. Query fields: `kind`, `id`, `phase`,
`owner`, `pipeline`, `started`, `finished`, `label.<key>`. Продолжать страницу
можно только opaque `next_page_token` предыдущего ответа.

System labels под `graphene.io/` нельзя задавать пользователю.
`Invoke.request_id` дедуплицирует retries; без него сервер создаёт id.

## RunsAPI

| Метод | Request | Result |
|---|---|---|
| `StartRun` | run id, pipeline, params, optional image и labels | workflow ids |
| `GetRun` | run id | фаза прогона |
| `WatchRun` | run id | текущий status, затем переходы до terminal |
| `RunResult` | run id | ждёт и возвращает state прогона: `result` (частичный у упавшего) и `error` |
| `CancelRun` | run id | просит cancellation с cleanup |
| `RunStatus` | run id | фаза и pending activities с attempts, failure, heartbeat |

Image делает run managed: worker запускает сервер. Params проверяются по
manifest выбранного pipeline или revision до старта. Runs перечисляются через
`ResourcesAPI.List` с kind `run`.

Фазы — один строчный словарь для прогонов и записей: прогон — `running`,
`completed`, `failed`, `canceled`, `terminated` или `timed-out`; запись —
`creating`, `ready`, `updating`, `deleting`, `deleted` или `failed`.
`phase=` селектора говорит теми же словами; `phase=deleted` перечисляет
записи, закончившие жизнь (насколько назад хранит retention).

`state` закрытого прогона — то, что оставило его закрытие: `{result}` у
завершённого, `{error, result}` у незавершённого — пайплайн закрывает
упавший прогон частичным результатом в details failure, а дверь читает его
обратно. `RunResult` возвращает те же два поля.

`ObserveAPI.Events` принимает `kinds` для фильтра на сервере; веха,
поставленная пайплайном через `EventsAPI.Emit`, приходит как kind `note` с
именем вехи в `subject` и payload в `input`.

## RevisionsAPI

| Метод | Request | Result |
|---|---|---|
| `Materialize` | pipeline и tar.gz bytes либо source ref | стадии `upload`, `runtime`, `build`, `describe`, `publish`, `done` |
| `RunRevision` | pipeline, revision, run id, params, labels | workflow ids draft run |

Materialization переживает отключение client, потому что build принадлежит
revision record. Финальный event `done` содержит revision id, image и manifest.

## SourceAPI

| Метод | Request | Result |
|---|---|---|
| `UploadSource` | pipeline id и tar.gz | location и digest |
| `DownloadSource` | source ref | tar.gz byte stream |
| `ListRuntimes` | empty | настроенные names, versions, images и default |
| `ListFiles` | source ref | paths, sizes и tree digest |
| `ReadFile` | source ref и path | file bytes |

Files read-only. Мутация source — движение Git ref и затем команда `sync`
записи.

## ObserveAPI

| Метод | Request | Stream/result |
|---|---|---|
| `State` | ref | workflow status и entity record, когда применимо |
| `Events` | ref, cursor, follow, optional activity id | классифицированная полная history с raw event |
| `Logs` | ref; since/until, limit, order, page_token, severities, stream, agent, entity, text; `query` — LogsQL внутри записи, либо raw без ref (admin) | записи, dropped, закрывающий `page{returned, truncated, next_page_token}` |
| `LogFacets` | выборка Logs, fields, limit | по каждому полю — значения с числом записей |
| `Metrics` | ref, time range, step_seconds, follow; `query` — PromQL внутри записи (backend `extra_filters`), либо raw без ref (admin) | snapshot JSON, live OTLP, dropped |
| `Trace` | ref, follow, limit; `query` — параметры Jaeger внутри записи, либо raw без ref (admin) | snapshot JSON, live OTLP, dropped |

Ошибки — коды: `INVALID_ARGUMENT` — запрос, шаг или фильтр, который отвергла
дверь или backend (4xx); `UNAVAILABLE` — backend не ответил или ответил
5xx; `UNIMPLEMENTED` — за измерением нет backend, либо scoped-PromQL на
backend без `extra_filters`; `PERMISSION_DENIED` — токену нельзя читать
запись, или raw-поверхность запросил не администратор. Пустая выборка —
`OK` и страница с нулём записей.

Raw queries бекенда доступны только admin и игнорируют record/follow. Live
metrics и traces — сериализованные стандартные OTLP export requests.

## AgentsAPI

| Метод | Request | Result |
|---|---|---|
| `Pty` | agent id, columns, rows | opened session id, raw output, final exit |
| `PtyInput` | session id и data, resize либо close | acknowledgement |

PTY намеренно смертен: shell закрывается при cancel stream, disconnect агента,
explicit close или exit процесса. Reconnect отсутствует.

## NamespacesAPI, RbacAPI, SecretsAPI

| Service.method | Request | Result |
|---|---|---|
| `NamespacesAPI.ServerInfo` | empty | version и component health |
| `RbacAPI.IssueToken` | account, TTL seconds, comment | token id, одноразовое value, expiry |
| `RbacAPI.WhoAmI` | empty | subject, groups, namespace, roles, allowed pairs, cluster-wide flag |
| `SecretsAPI.SetSecret` | name и value | новый version counter |

Metadata namespace, role, rolebinding, serviceaccount, var и secret остаётся
обычными записями. Значения token и secret используют dedicated methods,
потому что команда записи сохранила бы payload или result в history.
