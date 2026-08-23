---
sidebar_position: 5
title: Namespaces
sidebar_label: Namespaces
---

# Namespaces

## The unit of isolation

A **namespace** isolates everything: records, runs, and secrets of
different namespaces do not see each other. Every graphene namespace
mirrors into a Temporal namespace of the same name — the isolation
holds at the durable-core level, not as filters in server code.

## Tokens carry the scope

A **token** is the only kind of credentials. Three roles — `admin`,
`run`, `agent` — and every token is bound to a namespace; an admin
token may be bound to all of them:

```mermaid
flowchart TD
    subgraph NS1["namespace: team-a"]
      R1["records"]
      RUN1["runs"]
      S1["secrets"]
    end
    subgraph NS2["namespace: team-b"]
      R2["records"]
      RUN2["runs"]
      S2["secrets"]
    end
    T1["run token @team-a"] --> NS1
    T2["agent token @team-b<br/>+ bound to one agent"] --> NS2
    TA["admin token @*"] --> NS1
    TA --> NS2
    T1 -.->|"no path"| NS2
```

An agent token is additionally bound to one agent: it can embody that
record and no other.
