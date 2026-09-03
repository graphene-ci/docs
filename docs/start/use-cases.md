---
sidebar_position: 2
title: What you can build
sidebar_label: What you can build
---

# What you can build

Graphene is useful when a pipeline creates or uses resources whose state,
owner, lifetime, and diagnostics matter outside a single command.

## Temporary test infrastructure

A run can declare a network, subnet, virtual machine, agent, containers, and
artifacts as one ownership tree. Declarations converge concurrently; an
explicit `Ready` is the point where code needs a live output. When the run
finishes, Graphene tears down what the run still owns, including after
cancellation or a worker restart.

This fits integration, performance, compatibility, and upgrade tests that need
a real environment instead of an anonymous CI runner.

## Work on an existing machine

`pipeline.NewAgentViaSSH` installs the agent on a machine that already exists.
After bootstrap, the agent holds an outbound connection to the server and hosts
the pipeline's machine worker. Actions therefore do not require an inbound
agent port or a long-lived SSH credential in every job.

Use this for laboratories, bare-metal hosts, appliances, or VMs managed by a
different system.

## Durable environments and handoff

A resource belongs to exactly one owner. The default owner is the run that
created it, but the run may transfer a resource subtree to its pipeline's
permanent stand. An optional keep duration bounds how long it stays there.

This supports failed-environment retention, reusable services, caches, and
artifacts whose lifetime is longer than the producing run without making them
ownerless.

## Resource libraries, not a closed provider catalogue

Libraries bring resource kinds. The current repository contains Docker,
Kubernetes, Git, and file libraries. A Kubernetes library accepts native typed
objects and derives a Graphene kind from their GVK, so Crossplane resources and
ordinary Kubernetes objects participate in the same lifecycle without a
Graphene-specific copy of every provider schema.

## Pipelines connected by control and data

An upstream trigger starts one pipeline from another pipeline's outcome. A
published artifact is the corresponding data contract: another pipeline
attaches to the record and reads its blob. Both relationships are explicit and
observable.

## Operating and diagnosing the system

Every record has five views: current state, its event history, logs, metrics,
and traces. `graphenectl` exposes the generic record grammar and run lifecycle;
Graphene Studio provides the same installation through a resource tree,
inspectors, run views, topology, observability panes, and an agent terminal.

## Current boundary

The built-in authoring surface is the Go SDK. The development installation can
build and run Go pipeline sources and can be configured with additional build
runtimes, but those runtimes do not create a language-neutral authoring API.

The provided compose stack is for development and evaluation. Production
packaging, a hardened TLS-by-default deployment, and several administrative
workflows are still unfinished.
