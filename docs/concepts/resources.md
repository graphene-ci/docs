---
sidebar_position: 2
title: Resources
sidebar_label: Resources
---

# Resources

## Declaration returns a handle

Declaring a resource is an ordinary function call in the pipeline. It
returns a **handle** immediately, without blocking; the record is
created and the real resource converges in the background:

```mermaid
sequenceDiagram
    autonumber
    participant P as pipeline code (run)
    participant S as server
    participant E as record (entity)
    participant X as reality

    P->>P: declare resource → handle, immediately
    P->>S: declaration (spec, owner, labels)
    S->>E: create the record<br/>(exists — attach, not a duplicate)
    E->>X: create / converge the real resource
    E-->>E: phase: creating → ready
    P->>S: handle.Ready — first read
    S->>E: state
    E-->>P: outputs
    Note over P: subsequent Ready calls — the same outcome, no waiting
```

The outputs of a resource are reachable only through `Ready`: the
first read waits for convergence, and a readiness failure fails the
run at that point. An unready resource is impossible to use by
construction. Code that wants the error in hand calls `TryReady` — the
same operation returning the error as a value instead of failing the
run.

## The record lives a lifecycle

Every resource is backed by exactly one record. Its phase is visible
at any moment:

```mermaid
stateDiagram-v2
    [*] --> creating
    creating --> ready: converged
    creating --> create_failed
    ready --> ready: reconcile / drift-heal
    ready --> deleting: owner died / explicit delete / TTL expired
    deleting --> deleted
    deleting --> delete_failed
    deleted --> [*]
```

The record is a live process: while the resource exists, it
periodically reconciles the observed state against the desired one.
Disappearance and divergence are a reason to recreate or converge;
what counts as divergence is the resource library's knowledge.

## Every resource has one owner

The owner is the one a resource dies with: another resource, a run,
or the stand. Exactly one; by default — the run that created it.
Owners form a tree, declared with `Parent` and `Children` and changed
by transfer:

```mermaid
flowchart TD
    RUN["run"] --> NET["network"]
    NET --> SUB["subnet"]
    SUB --> VM["vm"]
    RUN -.->|"transfer + lifetime"| ST["stand"]
    ST --> ART["artifact<br/>TTL: 24h"]
    style ST stroke-dasharray: 5 5
```

Deleting an owner deletes its whole subtree, deepest first: the vm
before the subnet, the subnet before the network. A cancelled or
crashed run is a death like any other — its subtree goes down the same
road.

Two principles hold everywhere:

- **Ownership is given away — never taken.** A transfer is performed
  by the current owner's side; nothing can claim a resource for
  itself.
- **What is not yours cannot be burdened or given away.** A foreign
  resource can be *attached* — recognized and read like any handle —
  but an attached resource cannot be a parent or a child.

## Outliving the run

By default a run's resources die with the run. The only way to
outlive it is an explicit transfer — to another resource, or to the
pipeline's **stand**: the permanent owner every pipeline has. A
transfer moves the resource together with its subtree and may set a
**lifetime** — when it expires, the server deletes the subtree
itself:

```mermaid
sequenceDiagram
    autonumber
    participant W as run process
    participant S as server
    participant E as record

    W->>S: transfer resource → stand, lifetime 24h
    S->>E: owner: run → stand, keep-until = now+24h
    Note over E: the run ends — the resource stays
    loop server sweep
        S->>E: keep-until passed?
    end
    S->>E: delete (cascade, deepest first)
```

Without a lifetime, a transferred resource lives until an explicit
delete.
