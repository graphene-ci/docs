---
sidebar_position: 2
title: Конфигурация сервера
sidebar_label: Конфигурация сервера
---

# Конфигурация сервера

`graphene-server` читает опциональный YAML и перекрывает каждое поле переменными
окружения. `GRAPHENE_SERVER_CONFIG` выбирает файл; иначе при наличии читается
`/etc/graphene/server.yaml`. Имя env — upper-case dotted path под `GRAPHENE`:
например, `server.external` превращается в `GRAPHENE_SERVER_EXTERNAL`.

Сервер отказывается стартовать при невалидной конфигурации или полном
отсутствии токенов аутентификации.

## Полная форма YAML

```yaml
server:
  listen: ":7233"
  external: "graphene.example.com:443"
temporal:
  host_port: "temporal:7233"
  namespace: "default"
registry:
  upstream: "http://registry:5000"
blobs:
  backend: "s3" # file | s3
  dir: "/var/lib/graphene-server/blobs"
  s3:
    endpoint: "s3.example.com"
    bucket: "graphene-blobs"
    access_key: "..."
    secret_key: "..."
    use_ssl: true
auth:
  admin_tokens: "token@*, team-token@team-a"
  run_tokens: "run-token@default"
  agent_tokens: "edge-1:token@team-a"
secrets:
  file: "/run/secrets/graphene.yaml"
  values: {}
  store: "/var/lib/graphene/secrets.enc"
  key: "64-hex-characters"
vars:
  values: {}
  store: "/var/lib/graphene/vars.enc"
identity:
  issuer: "https://id.example.com/realms/platform"
  audience: "graphene"
  username_claim: "sub"
  groups_claim: "groups"
  signing_key: "..."
runtimes: []
otel:
  traces: "http://traces/insert/opentelemetry/v1/traces"
  logs: "http://logs/insert/opentelemetry/v1/logs"
  metrics: "http://metrics/opentelemetry/v1/metrics"
  query:
    traces: "http://traces/select/jaeger"
    logs: "http://logs"
    metrics: "http://metrics"
log:
  level: "info"
  format: "json"
intervals:
  agent_heartbeat_seconds: 15
  sweep_seconds: 30
  reap_seconds: 10
```

## Сеть и зависимости

| Ключ | По умолчанию | Значение |
|---|---|---|
| `server.listen` | `:7233` | единый listener всех протоколов |
| `server.external` | loopback из listen | адрес, куда звонят агенты и workers |
| `temporal.host_port` | `127.0.0.1:7234` | Temporal frontend |
| `temporal.namespace` | `default` | Temporal namespace, зеркальный Graphene |
| `registry.upstream` | пусто | registry за `/v2` proxy сервера |

`server.external` — `host:port`, а не URL. Адрес должен быть достижим с
удалённых агентов и их worker containers. TLS завершается на HTTP/2-capable
proxy перед `server.listen`; сам сервер сейчас отдаёт h2c/plaintext.

## Blob storage

`blobs.backend=file` пишет под `blobs.dir`. Для `s3` нужны endpoint, bucket и
credentials; `use_ssl` управляет транспортом к endpoint. Lifecycle байтов
принадлежит записям: удаление source, revision или artifact удаляет их данные.
Durability и backup хранилища остаются ответственностью оператора.

## Аутентификация и значения

Синтаксис статических токенов:

- admin: `token[@namespace]`, namespace по умолчанию `*`;
- run: `token[@namespace]`, по умолчанию `default`;
- agent: `agentId:token[@namespace]`, по умолчанию `default`.

Записи разделяются запятыми. Для людей предпочтителен OIDC, для автоматизации
— токены service accounts; статические значения нужны прежде всего для
bootstrap/development.

`secrets.key` — ровно 64 шестнадцатеричных символа. Он запечатывает mutable
stores секретов и variables; пустой ключ держит секреты в памяти и подходит
только одноразовому development. Потеря или смена ключа делает старый store
нечитаемым. Значения `secrets.file` перекрывают совпавшие `secrets.values`.

OIDC по умолчанию берёт username из `sub`, memberships из `groups`. Signing key
подписывает короткоживущие credentials run и agent; пустое значение использует
`secrets.key`. Без обоих ключей dynamic minting credentials агента недоступен.

## Runtimes

Go 1.26 встроен. Запись runtime содержит `name`, `version`, `image`, `build`,
`artifact`, `describe`, `base`. Совпавшее имя перекрывает поля встроенного
runtime; новый runtime должен разрешить как минимум image, build command и путь
artifact.

```yaml
runtimes:
  - name: go
    image: registry.example/toolchains/go:1.26
    base: registry.example/base/static:nonroot
```

Итоговый каталог показывает `graphenectl source runtimes`. Настроенный
toolchain умеет собрать бинарь, но не создаёт SDK Graphene для другого языка.

## Телеметрия

`otel.traces`, `logs`, `metrics` — ingest URLs OTLP/HTTP. Пустое значение
принимает и теряет этот сигнал. Query URLs — read-side бекенды Observe API:
PromQL-compatible metrics, LogsQL-compatible logs и Jaeger-compatible traces.

Сервер не доказывает, что ingest и query endpoints относятся к одному backend.
Проверяйте их [командами наблюдаемости](../graphenectl/observe.md).

## Логи и интервалы

Уровни логов: `debug`, `info`, `warn`, `error`; форматы: `json`, `console`.
Heartbeat определяет liveness агента. Sweep и reap интервалы управляют фоновой
уборкой записей и executors; уменьшайте их только после оценки нагрузки на
control plane.
