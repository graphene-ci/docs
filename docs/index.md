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
  <p className="graphene-hero__tagline">
    A control plane for CI and infrastructure:<br/>
    the process and the resource in one model.
  </p>
</div>

## The problem

Every automation around software consists of two things:
**processes** (build, test, deploy) and **infrastructure** those
processes live on (machines, clusters, databases, stands). Tools
split along this boundary historically: CI systems took the
processes, IaC tools took the infrastructure. *The boundary cut right
through the most interesting part.*

CI systems manage the graph of execution steps — and nothing else.
The lifetime and the state of the infrastructure those steps create
stay outside the model.

A typical scenario: a job creates a machine, runs tests on it, and
deletes it in the last step. This model has exactly one concept —
the **step**. The machine the step created does not exist for CI: it
has no
state, no owner, no lifetime. So the model cannot answer:

1. **What is happening to the machine right now?** CI has a step
   status — a resource state does not exist.
2. **Who owns the machine, and until when must it live?**
3. **Who guarantees deletion** when the job is cancelled, times out,
   or the runner dies? `destroy` is just another step that may never
   run.
4. **How to describe the machine's parameters as a contract** for the
   caller? A workflow's input is untyped strings.
5. **How does another job or pipeline reuse** the machine that
   already exists? There is nothing to pass a resource between runs
   with.
6. **How to resume a failed run from where it stopped**, without
   recreating the machine? Retry starts everything from the beginning.
7. **How to execute a step on the machine itself** without opening
   ports on it and handing out ssh keys through CI secrets?

Everything the model cannot do gets written as scripts around
scripts — their purpose dissolves in their volume, and maintaining
them becomes a full development effort of its own.

IaC tools (Terraform, Pulumi, Crossplane) are the mirror opposite.
Their model has exactly one concept — the **desired state**. The
resource
is described, but the process that created it and that it exists for
does not exist for IaC. So this model cannot answer its own questions
either:

1. **What does the resource exist for, and who consumes it?** The
   state has the "what" but no "why" — using the resource lies
   entirely outside the model.
2. **How long must the resource live?** A resource exists as long as
   its description is in the code: a temporary stand for one run is
   foreign to the model.
3. **Who owns the resource when there are many pipelines?** One state
   for everyone — parallel runs queue up for the lock or share
   resources that are not theirs.
4. **What happens when `apply` dies halfway?** It is a command, not a
   recoverable process: the state is out of sync and the cleanup is
   manual.
5. **Who notices that reality diverged from the description?** Drift
   is discovered on the next `plan` — that is, when somebody runs it
   by hand.

:::info

**CI owns the process without the resources; IaC owns the resources
without the process.** The link — *"this process created this
resource, uses it, and answers for its death"* — exists in neither
model. That link is what graphene is about.

:::

# Graphene

Graphene is a control plane for CI and infrastructure: **the process
and the resource exist in one model**.

## The idea

Two decisions define graphene:

1. **A pipeline is a program.** Not YAML with embedded shell, but code
   in a general-purpose language: types, control flow, libraries,
   tests. Declaring a resource and executing an action on a machine
   are ordinary function calls. A pipeline run is a *recoverable
   process*, not a sequence of steps.

2. **Everything created is accounted for.** Every resource gets a
   *durable record*: state, owner, lifetime. Owners form a tree;
   deleting an owner cascades through its subtree. A resource cannot
   be created without being recorded — *orphaned infrastructure is
   impossible by construction*.

These two decisions answer both lists of questions:

- **What is happening to the resource now?** The record holds its
  state and phase; ask it at any moment without touching the resource.
- **Who owns it and how long does it live?** The owner and the
  lifetime are part of the record, not a comment in the code.
- **Who deletes it?** The owner's death deletes its whole subtree;
  a cancelled or crashed run is a death too.
- **A parameter contract?** The pipeline's input is typed — the
  compiler checks the contract, not a convention about strings.
- **Reuse?** A resource is handed to a new owner explicitly — to
  another resource, or to the pipeline's stand, with a lifetime.
- **Resume after a failure?** The run is recoverable: after a crash
  it continues from where it stopped, without recreating resources.
- **Execute on a machine?** The agent on the machine connects
  outward to the server itself; no open ports, no handing out ssh
  keys.
- **What does the resource exist for, and what if `apply` dies?**
  The resource is created by a specific run and recorded against it;
  creation is part of a recoverable process, not a command that can
  be lost halfway.
- **Who notices drift?** The resource's record is a live process: it
  periodically reconciles reality against the desired state itself.
