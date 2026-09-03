---
sidebar_position: 1
title: Operator workspace
sidebar_label: Operator workspace
---

# Graphene Studio

Graphene Studio is the standalone operator application for a Graphene
installation. It is delivered separately from the server and connects only
through the public Management API, so one Studio build can work with several
named installation contexts.

The web application stores the selected server, namespace, and token locally in
the browser. The desktop build wraps the same renderer in Electron; it does not
add a private server protocol.

## Current workspace

Studio currently provides:

- named contexts, connection verification, namespace switching, theme, and
  English/Russian UI;
- a generic resource tree and inspectors for system and library-brought kinds;
- pipeline, source, revision, run, and agent views;
- server-side materialization of a read-only Git source, streamed build output,
  draft revision runs, and revision activation;
- typed run submission, rerun and cancel actions, a live execution trace, and
  navigation through the run's owned subtree;
- record state, events, filtered logs, metric charts, traces, downloads,
  commands, transfer, and deletion according to the caller's permissions;
- ownership and declared-flow topology;
- an interactive terminal to a connected agent.

Git source files are intentionally read-only. Edit and commit in Git, sync the
source record, then materialize another immutable revision.

## Connecting

Add a context with the installation's door address and a token. TLS is the
normal remote mode. Plaintext is appropriate only for the local development
stack and must be selected explicitly. The handshake runs before the context is
saved and the server's `WhoAmI` response determines available namespaces and
actions.

Studio does not bypass authorization: actions hidden or disabled in the UI are
still enforced by the same Management API used by `graphenectl`.

Continue with [Connect to an installation](./connect.md), then choose the
workflow you need:

- [Sources and pipelines](./pipelines.md) — synchronize Git, build a revision,
  test it as a draft, and activate it;
- [Runs and resources](./runs-resources.md) — start and diagnose work, inspect
  ownership, operate records, and open an agent terminal.

## Current limits

Agent update and restart buttons are visible as coming-soon actions; the agent
can self-update when the installation serves a newer binary, but Studio does
not yet trigger that lifecycle manually. Studio also does not edit a Git source
or configure the installation's external identity, secret, and telemetry
services.

For local development and desktop packaging, use the technical README in the
[`studio` repository](https://github.com/graphene-ci/studio).
