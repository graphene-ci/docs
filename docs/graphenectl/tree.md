---
sidebar_position: 7
title: tree
sidebar_label: tree
---

# tree

```text
graphenectl tree <owner-ref>
```

The ownership tree under one owner: the same recursive `EntityOwner`
walk that cascade deletion uses, read-only. It answers "what dies with
this owner".

The one argument is a full owner ref — `run/x`, `stand/p`,
`agent/vm-1` (an agent owns the containers on its machine).

## Examples

```console
$ graphenectl tree run/run-e2e
run/run-e2e
  agent/vm-e2e (ready)
    docker-volume/graphene-e2e-run-e2e (ready)
  artifact/e2e-report (ready)
```

```console
$ graphenectl tree stand/perf-nightly
stand/perf-nightly
  k8s.compute…Instance/vm-1 (ready)
    agent/edge-1 (ready)
```

`-o json` returns the same tree as nested nodes for scripting; see
[Output forms](outputs.md).
