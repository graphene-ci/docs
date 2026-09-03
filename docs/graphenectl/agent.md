---
sidebar_position: 13
title: Agent shell
sidebar_label: agent shell
---

# Agent shell

A connected agent can open an interactive shell without exposing SSH or another
inbound port on the machine:

```console
$ graphenectl get agent
$ graphenectl agent shell edge-1
```

The terminal, resize events, and exit status travel through the installation's
door and the agent's existing outbound session. The server authorizes the PTY
request against the selected namespace before forwarding it.

The agent installation should set `GRAPHENE_AGENT_PTY_USER` to an
unprivileged account. If the configured account cannot be resolved, opening the
shell fails. An agent started as root without this setting warns and otherwise
inherits that identity, so this setting is part of a secure installation rather
than a UI preference.

The shell is an operator diagnostic path. Pipeline work should use typed
activities through the SDK so its inputs, retry guarantee, ownership, and
observability remain part of the run.

