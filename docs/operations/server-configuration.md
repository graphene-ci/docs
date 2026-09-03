---
sidebar_position: 2
title: Server configuration
sidebar_label: Server configuration
---

# Server configuration

`graphene-server` loads optional YAML and overlays every field from environment
variables. `GRAPHENE_SERVER_CONFIG` selects the file; otherwise
`/etc/graphene/server.yaml` is used when present. An environment name is the
upper-case dotted path under `GRAPHENE`, for example `server.external` becomes
`GRAPHENE_SERVER_EXTERNAL`.

The server refuses to start when configuration is invalid or no authentication
token exists.

## Complete YAML shape

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

## Network and dependencies

| Key | Default | Meaning |
|---|---|---|
| `server.listen` | `:7233` | the single listener for all protocols |
| `server.external` | loopback derived from listen | address agents and workers dial |
| `temporal.host_port` | `127.0.0.1:7234` | Temporal frontend |
| `temporal.namespace` | `default` | Temporal namespace mirrored by Graphene |
| `registry.upstream` | empty | registry behind the server's `/v2` proxy |

`server.external` is `host:port`, not a URL. It must be reachable from remote
agents and their worker containers. TLS terminates at an HTTP/2-capable proxy
in front of `server.listen`; the server currently serves h2c/plaintext itself.

## Blob storage

`blobs.backend=file` writes under `blobs.dir`. `s3` requires endpoint, bucket
and credentials; `use_ssl` controls transport to that endpoint. The server owns
blob lifecycle through records: deleting a source, revision or artifact removes
its bytes. Storage durability and backup remain the operator's responsibility.

## Authentication and values

Static token syntax:

- admin: `token[@namespace]`, default namespace `*`;
- run: `token[@namespace]`, default `default`;
- agent: `agentId:token[@namespace]`, default `default`.

Entries are comma-separated. Prefer OIDC for people and service-account tokens
for automation; static values are primarily bootstrap/development wiring.

`secrets.key` is exactly 64 hexadecimal characters. It seals both mutable
secret and variable stores; an empty key keeps secrets in memory and is only
suitable for disposable development. Losing or changing the key makes the
existing store unreadable. Values from `secrets.file` override matching
`secrets.values` entries.

OIDC defaults are `sub` for username and `groups` for memberships. The signing
key signs short-lived run and agent credentials; when empty it falls back to
`secrets.key`. Without either key, dynamic agent credential minting is
unavailable.

## Runtimes

Go 1.26 is built in. A runtime entry has `name`, `version`, `image`, `build`,
`artifact`, `describe`, and `base`. A matching name overrides built-in fields;
a new runtime must at least resolve image, build command and artifact path.

```yaml
runtimes:
  - name: go
    image: registry.example/toolchains/go:1.26
    base: registry.example/base/static:nonroot
```

Inspect the resolved catalogue with `graphenectl source runtimes`. A configured
toolchain builds a binary but does not create a Graphene SDK for another
language.

## Telemetry

`otel.traces`, `logs`, and `metrics` are OTLP/HTTP ingest URLs. Empty accepts
and drops that signal. Query URLs are read-side backends used by Observe API:
PromQL-compatible metrics, LogsQL-compatible logs and Jaeger-compatible traces.

The server does not verify that ingest and query endpoints describe the same
backend. Check them with [observability commands](../graphenectl/observe.md).

## Logging and intervals

Log levels are `debug`, `info`, `warn`, `error`; formats are `json` and
`console`. Heartbeat controls agent liveness. Sweep and reap intervals drive
background record and executor cleanup; reduce them only after measuring the
extra control-plane load.
