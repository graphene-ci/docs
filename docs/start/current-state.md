---
sidebar_position: 1
title: Current state
sidebar_label: Current state
---

# Current state

Graphene is usable today as a Go pipeline SDK, a development control plane,
`graphenectl`, a Linux machine agent, resource libraries, and an operator UI.
This page is the boundary between shipped behavior and future work.

## Available now

| Surface | Current behavior |
|---|---|
| Pipeline | A Go program with typed params and result; `plan`, `push`, and managed `run` |
| Control plane | Durable runs and resource records on Temporal; one external server door |
| Sources | Read-only Git sources and local upload; immutable materialized revisions |
| Machines | Outbound Linux agent, SSH or cloud-init installation, per-run `runc` executor |
| Resources | Ownership tree, cascade deletion, stand/TTL, labels, selection, commands and flows |
| Libraries | Docker, Kubernetes/Crossplane, file delivery, Git actions, artifacts and machine actions |
| Operations | Generic CLI, five observability dimensions, RBAC, namespaces and service accounts |
| Studio | Web/Electron workspace over the public Management API |

Start with [the local plan](first-look.md) to inspect the model without a
server, or follow [the development run](end-to-end.md) to execute it.

## Deliberate boundaries

- Pipelines are Go programs. Pkl, KCL and YAML pipeline definitions belong to
  an archived design and are not product interfaces.
- Git is the source of edits. Graphene inspects and builds a checkout; it does
  not maintain editable changes on top of a commit.
- An agent's executor container packages the pipeline; it is not a security
  sandbox from the host. Machine actions receive the configured host-level
  access.
- Kubernetes is a placement option and a resource target, not a requirement
  for the control plane.
- Large data belongs in artifacts or telemetry backends, not in run results or
  Temporal histories.

## Not shipped yet

| Limitation | Practical effect |
|---|---|
| Production distribution | The repository ships a development Compose stack, not a hardened deployment |
| Embedded `dev` loop | `pipeline dev` and `run --dev` return an explicit not-implemented error |
| Multi-architecture workers | Self-build currently targets Linux/amd64 |
| Automatic agent bootstrap exchange | Agent identities must already be configured by the installation |
| Dead-machine burial | Records anchored to a permanently lost machine require future operator tooling |
| HA and disaster-recovery contract | No supported topology, sizing or recovery SLA is published |

These limits must not be filled with guessed procedures. See
[Compatibility](../operations/compatibility.md) and the
[production boundary](../operations/development-installation.md#security-and-production-boundary)
before exposing an installation outside a development network.

## Documentation contract

Pages describe released behavior, not a roadmap. A feature absent from this
site is not implied by an old repository, issue, mock-up, or archived design.
The live installation remains discoverable through `graphenectl kinds` and
`graphenectl get kind/<name>`; that dictionary is authoritative for available
record types and commands.
