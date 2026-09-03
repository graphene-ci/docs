---
sidebar_position: 3
title: First local plan
sidebar_label: First local plan
---

# First local plan

The quickest truthful introduction needs no server or cloud credentials. Build
the execution plan recorded from the compiling full example:

```console
$ git clone https://github.com/graphene-ci/examples.git
$ cd examples/full
$ go run . plan
```

The command executes the pipeline's recording pass and prints:

- manual, cron, and webhook entry points;
- the concurrency policy;
- the resource ownership tree;
- declared actions, selections, foreign attachments, and transfers.

No infrastructure is created. Branches that depend on runtime values are not
visible in this optimistic recording pass; the output says so explicitly.
Use `plan -o json` for machine-readable output or `plan -o mermaid` for a
diagram.

The example itself demonstrates a real current surface: typed parameters,
Crossplane objects through the Kubernetes library, an existing machine and a
cloud VM agent, Docker resources, cron and webhook triggers, cross-pipeline
artifacts, ownership transfer, data-flow edges, and telemetry scraping.

## Development installation

The server repository carries a complete development stack:

```console
$ git clone https://github.com/graphene-ci/graphene.git
$ cd graphene
$ make configure
$ make compose-up
$ go build -o bin/graphenectl ./cmd/graphenectl
$ printf '%s\n' dev-admin-token | \
    bin/graphenectl login --server 127.0.0.1:7233 --token-stdin --insecure
$ bin/graphenectl get pipeline
```

The compose stack includes a Temporal development server, object storage, a
container registry, and metrics, logs, and trace backends. It is not a
production deployment: it publishes development credentials, uses plaintext
transport, and expects `GRAPHENE_SERVER_EXTERNAL` to be changed to an address
reachable by remote agents and worker containers before running a real
pipeline.

A complete run also needs the external systems named by the example. The
minimal example needs an existing SSH-reachable machine; the full example needs
a Kubernetes cluster with Crossplane and the Yandex Cloud provider. Read their
source as executable documentation and choose the smaller contour first.

See [Development installation](../operations/development-installation.md) for
the stack's services, persistence, remote-agent address, and security boundary.
