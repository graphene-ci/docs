---
sidebar_position: 1
title: Execution model
sidebar_label: Execution model
---

# Execution model

## One binary

A pipeline compiles into one binary. That binary executes in two
roles; the code is the same, the launch environment assigns the role:

| Role | Where it runs | What it does |
|---|---|---|
| `run` | the run's process: a container launched by the server, or a process launched by the user | drives the run |
| `machine` | a container on an agent's machine | executes the actions addressed to that machine |

There is no third form: everything the user writes executes in one of
these two instances of the same binary.

## Who connects to whom

There are exactly three kinds of connections in the system, all
leading to the server — outbound. The internal infrastructure —
Temporal (the durable core), the image registry, the blob store — is
invisible and unaddressable from outside:

```mermaid
flowchart LR
  subgraph OUTSIDE["outside"]
    RW["run process<br/>(role: run)"]
    B["browser / graphenectl"]
    subgraph M["user machine"]
      A["agent"]
      MC["container<br/>(role: machine)"]
    end
  end
  subgraph SRV["server — one port"]
    S["graphene server"]
  end
  subgraph INSIDE["internal infrastructure: unaddressable from outside"]
    T[("Temporal")]
    R[("image registry")]
    BL[("blob store")]
  end
  RW -->|"gRPC"| S
  MC -->|"gRPC"| S
  A -->|"outbound gRPC<br/>no ports on the machine"| S
  B -->|"HTTP / JSON"| S
  S --> T
  S --> R
  S --> BL
```

The pipeline, the agent, and the browser know one address: the
server's port.

## The run

A run starts through the server. The identifier names exactly one
run: starting it again with the same id attaches to the existing one
instead of creating a second.

There are two ways to give a run its executor:

- **Managed** — an image is given at start: the server launches the
  container itself and removes it after completion.
- **Inplace** — the user launches the binary themselves, anywhere:
  local development, their own orchestrator. The server only starts
  the run's process.

```mermaid
sequenceDiagram
    autonumber
    participant U as graphenectl / browser
    participant S as server
    participant T as Temporal
    participant W as run process (run)

    U->>S: start run (id, pipeline, params[, image])
    S->>T: start the run's process<br/>(id exists — attach, not a second run)
    alt managed: image given
        S->>W: launches a container from the image
    else inplace
        Note over W: the user launched the binary themselves
    end
    W->>S: connects (run token)
    S->>T: proxies: the executor receives work
    W->>W: recording pass, then execution
    W-->>S: run result
    alt managed
        S->>W: removes the container
    end
```

A run is recoverable: the execution history lives in Temporal, not in
the process. A crash, a restart, a network drop lose nothing — when
the executor comes back, the run continues from where it stopped.
Successfully completed actions never execute twice.

## Actions on a machine

An action is always addressed to an agent and executes on its
machine — not in the run's process. One container per (agent × run)
pair, brought up by the first action:

```mermaid
sequenceDiagram
    autonumber
    participant W as run process (run)
    participant S as server
    participant A as agent
    participant C as container (machine)

    W->>S: action → agent X
    alt first action of this (agent × run) pair
        S->>A: bring up a container from the run's image
        A->>S: pulls the image (through the registry behind the server)
        A->>C: starts it, role machine
        C->>S: connects (run token)
        S-->>S: waits until the container accepts work
    end
    S->>C: action
    C->>C: executes the function
    C-->>S: result
    S-->>W: result
    Note over W,C: subsequent actions go straight to the same container
    W-->>S: run closed
    S->>A: take the container down
    A->>C: stops it
```

The agent is a host, not an executor: it brings the container up and
watches it, but never looks inside the actions.

## The recording pass

Before the run starts, the pipeline function executes once in
recording mode:

- nothing executes — declarations of actions and resources only get
  registered;
- reads from resources return optimistic zeros (booleans — `true`),
  so guard conditions do not cut the walk short;
- everything found — actions, resource kinds — is known to the
  executor before work begins.

This is why actions and resources are declared right where they are
used, with no separate registration. The price: pipeline code must
survive a pass with zero-valued data.

## Run completion

Success, failure, and cancellation end down the same road:

```mermaid
flowchart TD
    E["run ends:<br/>success / failure / cancellation"] --> O["resources the run still owns:<br/>cascade delete, deepest first"]
    E --> Tr["transferred resources:<br/>untouched"]
    Tr --> TTL["transferred with a lifetime:<br/>the server deletes them when it expires"]
    E --> C["containers: the managed executor<br/>and the machine containers come down"]
```
