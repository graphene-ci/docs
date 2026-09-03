---
sidebar_position: 1
title: Development installation
sidebar_label: Development installation
---

# Development installation

The `graphene` repository contains a complete local stack for development and
evaluation. It is the shortest path from a local plan to a running control
plane, but it is not a production distribution.

## What starts

`make compose-up` builds the server and starts:

- a Temporal development server;
- MinIO for blobs and registry storage;
- a container registry;
- VictoriaMetrics, VictoriaLogs, and VictoriaTraces;
- the Graphene server.

The server exposes one door on `:7233`. Management and worker APIs, agent
sessions, the Temporal proxy, OTLP ingest, health probes, and the registry proxy
are routed through that listener. Only the telemetry UIs are published on their
own ports.

## Start and log in

You need Docker with Compose, Make, Git, and Go:

```console
$ git clone https://github.com/graphene-ci/graphene.git
$ cd graphene
$ make configure
$ export GRAPHENE_SECRETS_KEY="$(openssl rand -hex 32)"
$ make compose-up
$ go build -o bin/graphenectl ./cmd/graphenectl
$ printf '%s\n' dev-admin-token | \
    bin/graphenectl login --server 127.0.0.1:7233 --token-stdin --insecure
$ bin/graphenectl get namespace
```

Keep the same `GRAPHENE_SECRETS_KEY` while reusing the `graphene-data`
volume. The server refuses to open a secret store sealed with another key.

`make compose-down` stops the stack and keeps the named volumes. Use ordinary
Docker Compose volume management if you intentionally want a clean installation.

## Remote agents and workers

The default external address is `127.0.0.1:7233`, which is suitable only for
the local host. Before attaching another machine, publish a reachable address:

```console
$ export GRAPHENE_SERVER_EXTERNAL=192.0.2.10:7233
$ make compose-up
```

A remote agent and the worker container it hosts must both be able to reach that
address. Graphene agents make outbound connections; no inbound agent port is
required.

## Security and production boundary

The stack is intentionally development-only:

- transport is plaintext unless you put an HTTP/2-capable TLS proxy in front;
- admin, run, agent, MinIO, and registry credentials are development values;
- the server mounts the host Docker socket to launch managed run workers;
- dependency images currently use floating tags;
- Temporal and all storage/telemetry services are single-node development
  instances.

Replace every credential and use a stable external address before exposing the
door to any network. The repository does not currently ship a production
deployment. A production installation still needs an explicit topology,
pinned images, TLS, durable external storage, backup/restore, and key-management
decisions.

