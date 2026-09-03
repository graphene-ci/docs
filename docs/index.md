---
slug: /
sidebar_position: 1
title: Graphene
sidebar_label: Graphene
hide_title: true
---

<div className="graphene-hero">
  <img src="/docs/img/logo-full.svg" alt="" className="graphene-hero__mark graphene-hero__mark--dark" />
  <img src="/docs/img/logo-full-light.svg" alt="" className="graphene-hero__mark graphene-hero__mark--light" />
  <div className="graphene-hero__tagline">
    A control plane for CI and infrastructure:<br/>
    the process and the resource in one model.
  </div>
</div>

Graphene is for automation that must manage both **work** and the
**infrastructure where it runs**. A pipeline is a typed Go program. Machines,
containers, Kubernetes objects, files, and artifacts are durable resources
with state, an owner, and a lifetime.

That shared model solves the gap between CI, which normally sees only steps,
and IaC, which normally sees only desired state.

## What changes in practice

| Need | Graphene model |
|---|---|
| Create an environment for one test run | The run owns the resource tree; terminal completion finalizes it |
| Keep a failed environment for investigation | Transfer its subtree to the pipeline stand, optionally with a TTL |
| Work on a remote or existing machine | Its agent connects outward; actions need no inbound control port |
| Reuse data between pipelines | Publish and attach a durable artifact record |
| Recover from a worker crash | Execution resumes against recorded resources instead of recreating them blindly |
| Explain a failure | Read the same record's state, events, logs, metrics, and traces |

Resource libraries bring typed implementations without changing this model.
The current libraries cover [Docker](libraries/docker.md),
[Kubernetes and Crossplane](libraries/kubernetes.md), [Git](libraries/git.md),
and [files](libraries/file.md).

## Choose a path

| If you want to… | Start here |
|---|---|
| Understand the product and its current boundary | [Current state](start/current-state.md) → [What you can build](start/use-cases.md) |
| Try it without running a server | [First local plan](start/first-look.md) |
| Run a complete local workflow | [First development run](start/end-to-end.md) |
| Write a pipeline | [Pipeline binary commands](sdk/commands.md) → [Main](sdk/main.md) → [Core SDK reference](sdk/reference.md) |
| Operate from the command line | [`graphenectl`](graphenectl/index.md) |
| Operate visually | [Graphene Studio](studio/index.md) |
| Integrate another client | [Management API](api/index.md) |
| Configure or diagnose an installation | [Operations](operations/development-installation.md) |

## Current boundary

The repository provides a complete development installation, not a hardened
production distribution. Go is the only built-in pipeline authoring API.
Pkl/KCL and a language-neutral YAML pipeline format are not current product
surfaces. Exact shipped and unfinished capabilities are kept in
[Current state](start/current-state.md).
