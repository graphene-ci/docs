---
sidebar_position: 3
title: Operate agents
sidebar_label: Agents
---

# Operate agents

An agent connects one Linux machine to one Graphene installation. It listens on
no network port and continuously reconnects outbound to the server.

## Installation paths

- `pipeline.NewAgent(...).CloudInit()` returns user-data for a machine being
  created by the pipeline.
- `pipeline.NewAgentViaSSH(...)` uses the same script on an existing machine.
- A manual installation may run the binary with the environment below, but the
  server does not currently expose a public `graphenectl agent install` command.

The generated script installs `/usr/local/bin/graphene-agent`, writes mode-0600
configuration to `/etc/graphene-agent/env`, tries to install `runc`, creates the
unprivileged `graphene-run` PTY user, and installs a systemd service when
systemd exists. On another init system, start the binary yourself with that env
file.

## Environment

| Variable | Required/default | Meaning |
|---|---|---|
| `GRAPHENE_AGENT_SERVER` | required | server `host:port` |
| `GRAPHENE_AGENT_TOKEN` | required | credential scoped to this agent |
| `GRAPHENE_AGENT_ID` | required | record id embodied by the process |
| `GRAPHENE_AGENT_INSECURE` | false | disable TLS; development only |
| `GRAPHENE_AGENT_CA_FILE` | empty | extra CA bundle for server TLS |
| `GRAPHENE_AGENT_DATA_DIR` | `/var/lib/graphene-agent` | images and runtime bundles |
| `GRAPHENE_AGENT_RUNTIME` | `runc` | `runc`, or `exec` for development |
| `GRAPHENE_AGENT_REGISTRY` | empty | server registry proxy address |
| `GRAPHENE_AGENT_PTY_USER` | empty | user for interactive PTY; empty means root |

One machine may not be silently rebound to another id. Re-running the generated
script with a different id exits with `GRAPHENE_ALREADY_BOUND`; remove the old
identity only as an explicit machine-reprovisioning decision.

## Identity and lifecycle

The installation may use a configured `agentId:token@namespace` or mint a
credential when a signing key exists. The generated token is scoped to the
single agent and has a 30-day issuance TTL. This is not yet a one-time bootstrap
exchange.

At session start the agent reports machine facts and the SHA-256 of its binary.
When the server advertises a different binary digest, the agent downloads it
from `/agent/binary`, verifies the digest, replaces itself and asks systemd to
restart. The connection then converges again.

## Runtime and trust

The agent runs as root when it drives `runc`. Each machine/run pair receives a
worker container with the host mounted at `/host`; `machine.Command` acts on the
host filesystem. Packaging is not isolation. Interactive PTY should run as
`graphene-run`; an empty PTY user grants a root shell and is logged as a warning.

## Health and diagnostics

```console
$ graphenectl get agent
$ graphenectl get agent/edge-1 -o json
$ graphenectl events agent/edge-1
$ graphenectl logs agent/edge-1 -f
$ graphenectl agent shell edge-1
```

On a systemd host:

```console
$ systemctl status graphene-agent
$ journalctl -u graphene-agent -f
$ runc list
```

An offline agent does not immediately destroy its records: reconnect and
machine reboot are expected. Permanently lost machines currently have no
supported burial command; see [Current state](../start/current-state.md).
