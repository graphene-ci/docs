---
sidebar_position: 4
title: Labels
sidebar_label: Labels
---

# Labels

## Markers, never data

A **label** is a `key=value` pair on any record and on a run.
Metric-label semantics: selection and grouping, never data. Labels are
set at declaration and changed by a record command; the system never
interprets the values.

Keys under the reserved `graphene.io/` prefix are **system labels**,
written only by the system; user input with this prefix is rejected.
`graphene.io/run` names the run that created the record — stable
across transfers, unlike the owner.

## Selection

A **selector** is kind + phase + owner + labels; every set field must
match. Selection works the same everywhere labels appear — listing
records, choosing agents, filtering runs:

```mermaid
flowchart LR
    subgraph RECORDS["records"]
      A1["agent/vm-1<br/>role=builder env=prod"]
      A2["agent/vm-2<br/>role=builder env=test"]
      A3["agent/vm-3<br/>role=web"]
    end
    SEL["selector:<br/>kind=agent<br/>role=builder, env=prod"] --> A1
    SEL -.->|"env mismatch"| A2
    SEL -.->|"role mismatch"| A3
    style A1 stroke-width:3px
```

Matching is equality and "one of" — nothing else. There are no
comparisons, no expressions, no versions: a selector the system could
interpret would be one more thing to be wrong about.
