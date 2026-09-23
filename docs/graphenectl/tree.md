---
sidebar_position: 7
title: tree
sidebar_label: tree
---

# tree

```text
graphenectl tree [owner-ref] [--include-deleted] [--flows]
```

The ownership tree under one owner: the same recursive `EntityOwner`
walk that cascade deletion uses, read-only. It answers "what dies with
this owner".

The argument is a full owner ref — `run/x`, `stand/p`, `agent/vm-1`
(an agent owns the containers on its machine). With no argument the
command prints the forest's roots: every record nobody owns, each with
its subtree. Nodes come in ref order; the dictionary of kinds stays out
of the roots — it is [`kinds`](lifecycle.md#kinds).

The tree of a **run is always whole**: a finished run is history, and
its topology after the teardown is what one comes to see — the machines
and containers show with `phase: deleted`, as far back as the
namespace's retention keeps their history.

```console
$ graphenectl tree run/nightly-0917
run/nightly-0917
├─ agent/db-1                                  deleted   2d3h
│  └─ docker/pg                                deleted   2d3h
└─ agent/runner-1                              deleted   2d3h
```

Every other owner's tree is of **live** records; `--include-deleted`
adds the ones that finished their life. An owner whose children are all
gone says so instead of printing nothing.

```console
$ graphenectl tree stand/perf-nightly
stand/perf-nightly
└─ nothing live is owned by stand/perf-nightly
```

## Examples

```console
$ graphenectl tree run/run-e2e
run/run-e2e
├─ agent/vm-e2e                                ready     3m12s
│  └─ docker-volume/graphene-e2e-run-e2e       ready     2m40s
└─ artifact/e2e-report                         ready     14s
```

```console
$ graphenectl tree stand/perf-nightly
stand/perf-nightly
└─ k8s.compute…Instance/vm-1                   ready     4d1h
   └─ agent/edge-1                             ready     4d1h
```

Each node carries its phase and its age; the columns line up across the
whole tree.

`--flows` hangs each record's declared edges under it — the target, the
protocol with its port, the label — arrows in place of branches; a
dotted arrow is a system edge (agent↔server). This is the topology, of a
finished run too:

```console
$ graphenectl tree run/nightly-0917 --flows
run/nightly-0917
├─ agent/db-1                                  deleted   2d3h
│  ⇢ graphene-server                           otlp      obs
│  └─ docker/pg                                deleted   2d3h
└─ agent/runner-1                              deleted   2d3h
   └─ docker/stroppy                           deleted   2d3h
      → agent/db-1                             tcp:5432  postgres
```

`-o json` returns the same tree as nested nodes for scripting; see
[Output forms](outputs.md).
