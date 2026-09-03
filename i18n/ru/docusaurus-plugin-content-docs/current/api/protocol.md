---
sidebar_position: 3
title: Протокол, streams и ошибки
sidebar_label: Протокол и ошибки
---

# Протокол, streams и ошибки

Checked-in generated handlers обслуживают Connect, gRPC и gRPC-Web. Используйте
generated client своего языка: он правильно несёт procedure paths и protobuf
encoding.

## Authentication и namespace

Передавайте `Authorization: Bearer <token>` в каждом вызове. Невалидный token
получает HTTP 401 до RPC handler. Для известного principal RPC authorization
проверяет `verb × kind × namespace`; отказ — `permission_denied`.

`x-graphene-namespace` выбирает namespace. Статический scoped token может
выбрать только свой scope. OIDC и service-account identities заново проверяются
по bindings запрошенного namespace. Для discovery возможностей клиента
используйте `WhoAmI`.

## Коды ошибок

| Code | Значение для клиента |
|---|---|
| `invalid_argument` | сломан ref/query/spec/params или конфликтуют fields; исправить request |
| `unauthenticated` | нет валидной identity; получить новый token |
| `permission_denied` | identity известна, но точного права нет |
| `not_found` | отсутствует record, command, source, run, blob или session |
| `already_exists` | identity/name конфликтует с существующим объектом |
| `failed_precondition` | lifecycle state запрещает операцию |
| `aborted` | конфликт concurrent durable update; допустим retry |
| `resource_exhausted` | limit/backpressure сервера; retry с backoff |
| `unavailable` | недоступна dependency или transport; retry с backoff |
| `internal` | сервер упал вне контракта caller; сохранить details |

Unary и streaming handlers переводят один gRPC status в эквивалентный Connect
code. Окончание stream до документированного terminal message не является
успехом.

## Контракты streams

- `WatchRun` первым отдаёт текущий status и заканчивается после terminal.
- `Events(after_event_id)` использует id события Temporal history как стабильный
  resume cursor.
- `Logs(follow=true)` подписывается до чтения history и дедуплицирует шов
  history/live.
- `Metrics` и `Trace` отдают snapshot backend до live OTLP batches.
- Live telemetry сбрасывает самые старые данные медленного consumer и сообщает
  `dropped`, а не блокирует producers.
- `Pty` первым сообщает `session_id` и закрывает shell со смертью stream.
- `Download`, `DownloadSource` и materialization — server streams; caller должен
  дочитать или отменить их.

## Retry и idempotency

Повторяйте `unavailable`, `resource_exhausted`, `aborted` с ограниченным
exponential backoff. Reads безопасны. `Invoke` принимает `request_id` для
deduplication. Выбранный caller run id присоединяет тот же run и не должен
генерироваться заново после неопределённого ответа. Не повторяйте вслепую
mutation с неизвестным внешним эффектом.

## Payloads

Raw JSON bytes сохраняют schemas, заданные pipeline и resource kinds. До
отрисовки формы получите spec и command schemas из `kind/<name>`. OTLP batches
— сериализованные `ExportMetricsServiceRequest` или
`ExportTraceServiceRequest`; snapshots сохраняют JSON-формат query backend.
