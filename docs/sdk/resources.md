---
sidebar_position: 4
title: Resources & agents
sidebar_label: Resources & agents
---

# Resources & agents

Declaring a resource returns a handle; the outputs are reachable only
through `Ready`. The mechanics — the record, the phases, the ownership
tree — are in [Concepts / Resources](../concepts/resources.md); this
page is the code surface.

## Declaring agents

```go
// The record waits for its agent to connect (a fresh VM brings the
// agent through user-data).
vmAgent := pipeline.NewAgent(ctx, "edge-1",
	pipeline.WithLabels(map[string]string{"role": "edge"}))

// The machine already exists: the system's only touch is the ssh
// install. The key is a secret NAME; the host key is required —
// a control plane opening a root shell does not trust-on-first-use.
bareAgent := pipeline.NewAgentViaSSH(ctx, "bare-1", pipeline.SSHInstall{
	Address: params.BareHost,
	User:    params.BareUser,
	KeyRef:  pipeline.Secret(ctx, "bare-ssh-key"),
	HostKey: params.BareHostKey,
}, pipeline.WithLabels(map[string]string{"role": "edge"}))
```

`vmAgent.CloudInit()` renders the identity for a fresh VM's
user-data — how the agent gets onto a machine the pipeline is about to
create:

```go
vm := k8slib.Resource(ctx, k8sClient, "vm-1", &compute.Instance{
	...
	Metadata: map[string]*string{"user-data": ptr(vmAgent.CloudInit())},
}, k8slib.WithResourceOption[compute.Instance](pipeline.Children(vmAgent)))
```

## Declaration options

| Option | Meaning |
|---|---|
| `Parent(h)` | the new resource dies with `h` instead of the run |
| `Children(h...)` | the new resource claims existing resources it should own |
| `WithLabels(m)` | labels on the record — selection by equality |
| `Need(name, WhereLabel(k,v), WhereIn(k, v...))` | a capability requirement; readiness waits for it |

## Selection

```go
edges, err := pipeline.SelectAgents(ctx,
	pipeline.WithLabels(map[string]string{"role": "edge"}),
	pipeline.Need("docker"))
```

A snapshot of the matching agents; the selection is foreign — no
ownership taken.

## Foreign resources

```go
foreign := pipeline.AttachAgent(ctx, "edge-1", pipeline.Need("marker"))
baseline := pipeline.AttachArtifact(ctx, "baseline-report")
```

Attached resources read like your own; they cannot be a parent or a
child.

## Outliving the run

Long life is a transfer, not a sleep — the pipeline's stand always
exists:

```go
pipeline.ToStand(ctx, vm, pipeline.KeepFor(params.Keep)) // TTL bounds the stay
pipeline.ToStand(ctx, reportArtifact)                    // lives until an explicit delete
```

The workflow can return after the transfer completes; the machine stays up.
Ownership transfer emits activity heartbeats while waiting for the resource
entity, including during creation. Cancellation and activity deadlines still
bound the wait, and command errors propagate to the caller.

### Named stands

A run creates only its own pipeline's stand. A stand that several pipelines
or runs share is a **named stand**: applied as a record, with its own owner and
lifetime, then targeted with `OnStand`:

```yaml
# stand.yaml — graphenectl apply -f stand.yaml
kind: stand
id: tpcc-lab
spec:
  owner: pipeline/stroppy-stand   # or empty: the namespace owns it
  ttl: 168h                       # empty: lives until deleted
  idleTimeout: 72h                # empty: never idles out
```

```go
pipeline.ToStand(ctx, vm, pipeline.OnStand("tpcc-lab"))
```

A stand that was never applied, or is being deleted, refuses the transfer with
`stand_missing` before the resource changes hands. When the stand's TTL or idle
timeout runs out, the stand deletes itself and releases everything it holds.
`set-ttl` and `set-idle` change both later; every command on the stand counts as
use:

```bash
graphenectl invoke stand tpcc-lab set-ttl --data '{"ttl":"336h"}'
graphenectl invoke stand tpcc-lab set-idle --data '{}'     # never idle out
graphenectl invoke stand tpcc-lab release --data '{"ref":"yc.vm/db-2"}'
```

Ready-to-use implementations are documented in
[Resource libraries](../libraries/index.md).
