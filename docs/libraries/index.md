---
sidebar_position: 1
title: Resource libraries
sidebar_label: Overview
---

# Resource libraries

Libraries turn an external system into Graphene's two primitives:

- a **resource** is a durable owned record with convergence and finalize;
- an **action** is named one-shot work executed on an agent.

| Library | Resources | Actions |
|---|---|---|
| [Docker](docker.md) | container, network, volume | install engine, build image |
| [Kubernetes](kubernetes.md) | any typed Kubernetes object | apply/reconcile/delete inside the resource |
| [File](file.md) | file on a machine | write/remove inside the resource |
| [Git](git.md) | — | install, checkout, ls-remote, tag, commit |

All resource constructors return `pipeline.Resource[T]` and accept the same
ownership, label and flow options. All action constructors return
`activity.Call[T]` and execute through `activity.Activity` or `ActivityAll`.
Start with the [core reference](../sdk/reference.md).

The catalogue is open: a pipeline binary can bring another kind and publish
its schema through the manifest. `graphenectl kinds` shows the exact catalogue
of the connected installation.
