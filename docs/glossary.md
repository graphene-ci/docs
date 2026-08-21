---
sidebar_position: 2
title: Glossary
sidebar_label: Glossary
---

# Glossary

Terms in the meaning the system and this documentation use them. One
meaning per term.

## Execution

**Pipeline** — the unit of automation in graphene: a program in a
general-purpose language, built with the SDK. It describes both the
process and the resources that process needs — declares them, executes
actions on machines, and owns what it created. One pipeline — one name
and one binary.

**Run** — one execution of a pipeline and the default owner of
everything it created. Recoverable: after a crash it continues from
where it stopped. The identifier names exactly one run: starting it
again attaches to the existing one.

**Role** — what a particular instance of the pipeline binary is doing:
`run` drives the run, `machine` executes actions on an agent's
machine. The code is the same; the launch environment assigns the
role.

**Managed / inplace** — the two ways to give a run its executor.
Managed: the server itself launches a container from the given image
and removes it after completion. Inplace: the user launches the binary
themselves, anywhere; the server only starts the run's process.

**Action (activity)** — a function addressed to an agent and executed
on its machine; it can also be addressed to a set of agents at once. A
failed action is retried; a successfully completed one never executes
twice.

**Recording pass** — a single execution of the pipeline function
before the run starts: nothing executes, declarations of actions and
resources get registered, reads return optimistic zeros. It is why
declarations live right in the code, with no separate registration;
the price — the code must survive a pass with zero-valued data.

## Records

**Resource** — anything that has a durable record and an owner: an
agent, an artifact, a Kubernetes object, any type from a resource
library. Created by declaring it in a pipeline; a resource cannot be
created without a record.

**Record (entity)** — the implementation of a resource: a live durable
process that holds spec and state, executes commands in order, and
periodically reconciles reality against the desired state. One
resource — exactly one record: declaring it again attaches to the
existing one.

**Spec / State** — the two halves of a record. Spec is the desired
configuration, set by the declaration. State is the observed
condition, written only by the record itself over its life.

**Phase** — the record's position in the lifecycle: `creating`,
`ready`, `deleting`, `deleted`, `create_failed`, `delete_failed`.
`ready` means the resource has converged to the desired state and its
outputs are available.

**Handle** — what declaring a resource returns: immediately, without
blocking. The resource's outputs are reachable only through `Ready`:
the first read waits for readiness, and a readiness failure fails the
run at that point. An unready resource is impossible to use by
construction.

**Attached resource** — the handle of a FOREIGN resource: recognized,
never created. Reads like any handle, but cannot be a parent or a
child in the ownership tree: what is not yours can be neither burdened
nor given away.

**Resource library** — an ordinary module on top of the SDK that
brings its own resource types: Kubernetes objects, docker, anything.
A library resource is a first-class one: the same record, the same
ownership, the same labels.

## Ownership

**Owner** — the one a resource dies with: another resource, a run, or
the stand. Exactly one; by default — the creating run. The owner is
part of the resource's record and visible at any moment.

**Ownership tree** — the graph the owners form. Set at declaration
(`Parent`, `Children`), changed by transfer. Ownership is given away —
never taken.

**Cascade delete** — deleting an owner deletes its whole subtree,
deepest first: the virtual machine before the subnet, the subnet
before the network.

**Transfer** — changing a resource's owner together with its subtree:
to another resource or to the stand, optionally with a lifetime under
the new owner. The only way for a resource to outlive its run.

**Stand** — the permanent owner every pipeline has. Resources
transferred to the stand outlive their run — this is how a pipeline's
long-lived infrastructure persists between runs.

**Lifetime (TTL)** — the bound on a resource's stay under its new
owner, set at transfer. When it expires, the server deletes the
subtree itself. Without one, the resource lives until an explicit
delete.

## Machines

**Agent** — a process on the user's machine and, at the same time, a
resource — the record linking the real machine to that process. It
connects to the server with an outbound connection only — the machine
opens no ports. Declaring an agent does not create a machine: the
record waits for its agent to connect (or installs it over SSH when
configured).

**Machine facts** — what the agent reported about the real machine:
addresses, OS, capacity. Stored apart from the record; the record
keeps only a reference.

**Capability** — one thing a machine can do, written onto its record
by a publisher: an installer, a person, an image. Never "discovered".
Has a name, labels, an informative version, and a readiness flag.
Belongs to the machine: the installer's run may die, docker stays
installed.

**Need** — a capability requirement on an agent: a name plus label
constraints (equality and "one of"). Versions are never compared. The
agent's readiness waits for every need to be met — the refusal comes
before work is dispatched, not after it fails.

## Data

**Artifact** — a resource whose bytes live in the blob store while the
record keeps the digest. Uploaded from a run; a foreign artifact can
be attached.

**Blob** — bytes addressed by content: the key is the hash. The server
computes the digest on upload — a client cannot forge it.

**Secret** — a named value on the server, set by an administrator.
Only the name travels in specs, logs, and history; the executing code
receives the value at the moment of use and never returns it.

## Selection

**Label** — a `key=value` pair on any record and on a run.
Metric-label semantics: selection and grouping, never data. Set at
declaration, changed by a record command.

**System label** — a label under the reserved `graphene.io/` prefix;
written only by the system. `graphene.io/run` — the run that created
the record (stable across transfers, unlike the owner).

**Selector** — kind + phase + owner + labels; every set field must
match.

## Control plane

**Server** — the graphene control plane and the single point of entry:
one port through which agents, run processes, the browser, and the CLI
connect. The internal infrastructure (the durable core, the image
registry, the blob store) is invisible and unaddressable from outside;
TLS terminates at a proxy in front of the server.

**Namespace** — the unit of isolation. A token is bound to one
namespace or to all of them (administrators). Records, runs, and
secrets of different namespaces do not see each other.

**Token** — the only kind of credentials. Three roles: `admin`, `run`,
`agent`; an agent token is additionally bound to one agent. Every
token is bound to a namespace (an admin one — to all).
