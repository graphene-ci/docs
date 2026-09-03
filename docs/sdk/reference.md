---
sidebar_position: 8
title: Core SDK reference
sidebar_label: Core reference
---

# Core SDK reference

This is the public author surface. Constructors supplied for library authors
(`NewResource`, `NewAttached`, `FailedResource`, recording hooks and raw worker
APIs) are intentionally outside the ordinary pipeline workflow.

## Pipeline

| Symbol | Contract |
|---|---|
| `Main(id, fn, ...MainOption)` | serve one typed pipeline |
| `WithTriggers(...trigger.T)` | declare automatic entry points |
| `WithConcurrency(policy)` | set `Queue`, `CancelPrevious`, or `Parallel` |
| `Context.RunId()` | current run identity |
| `Context.Logger()` | replay-safe Temporal logger |
| `Var(name)` | visible installation value reference for trigger params |
| `UseSecret(name)` | secret-name reference for trigger params |
| `Secret(ctx, name)` | secret reference used inside the run |

## Handles and ownership

| Symbol | Contract |
|---|---|
| `Resource[T].Ready(ctx)` | wait and return `T`; convergence failure fails the run |
| `Resource[T].TryReady(ctx)` | wait and return `(T, error)` |
| `Attached[T]` | foreign readable handle with no ownership methods |
| `Parent(h)` | make `h` own the declaration |
| `Children(h...)` | give existing owned handles to the declaration |
| `WithLabels(map)` | attach selection labels |
| `WithFlow` / `WithFlowTo` | annotate an outgoing topology edge |
| `FlowPort(n)` | set the edge target port |
| `ToStand(ctx, h, ...TransferOption)` | move an owned subtree to the pipeline stand |
| `KeepFor(duration)` | TTL under the stand; omit for explicit deletion |

Flow protocols are `TCP`, `HTTP`, `GRPC`, `PrometheusPull`, `RemoteWrite`, and
`OTLP`. Flow annotations describe topology; they do not configure networking.

## Agents

| Symbol | Contract |
|---|---|
| `NewAgent` | declare a record and obtain cloud-init installation data |
| `NewAgentViaSSH` | declare and install on an existing SSH machine |
| `AttachAgent` | use an existing agent without ownership |
| `SelectAgents` | snapshot by labels and capability requirements |
| `Need` | require a ready capability |
| `WhereLabel`, `WhereIn` | constrain capability labels |
| `PublishCapability` | record what a workflow made true on a machine |

`AttachAgent` accepts capability requirements but not tree ownership. A
selection is also foreign and does not follow future matching agents.

## Actions and artifacts

| Symbol | Contract |
|---|---|
| `activity.Fn`, `ActivityFn`, `Fn0` | bind a stable name, body and serializable input |
| `activity.Activity` | execute on one agent |
| `activity.ActivityAll` | execute concurrently on a snapshot |
| `WithGuarantee` | `AtLeastOnce` or `AtMostOnce` |
| `WithTimeout`, `WithHeartbeat` | bound execution and detect loss |
| `NewArtifact` | publish `FromBytes` or `FromAgentFile` |
| `AttachArtifact` | read a foreign artifact record |

An at-most-once timeout joins `pipeline.ErrUnknown`: the system cannot prove
whether the external effect happened and will not repeat it silently.

See [resource libraries](../libraries/index.md) for constructors that return
these same handles.
