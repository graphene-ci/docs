---
sidebar_position: 4
title: Security model
sidebar_label: Security
---

# Security model

Graphene has one authenticated server door, namespace-scoped authorization and
write-only secrets. It does not turn machine automation into a sandbox.

## Trust boundaries

| Boundary | Contract |
|---|---|
| Client → server | Bearer token or registry Basic password; TLS belongs at the front proxy |
| Person → server | OIDC token; Graphene stores no user password |
| Run → server | short-lived token minted for that run and namespace |
| Agent → server | token restricted to one agent record and namespace |
| Worker → machine | agent-hosted container has host-level access through `/host` |
| Server → Docker | managed-run server mounts the host Docker socket |
| Server → stores | blob, secret and telemetry credentials are installation secrets |

Do not expose the development Compose door: it uses known tokens, plaintext,
floating dependency tags and a privileged Docker socket.

## Authorization

A permission is `verb × kind × namespace`. Rules are additive; there is no deny
rule or object-level ACL. Subjects are `user:<name>`, `group:<name>`, and
`sa:<name>`. Bindings grant one role in one namespace or `*`.

Verbs are `get`, `list`, `watch`, `create`, `update`, `delete`, `transfer`,
`invoke`, `run`, `build`, and `activate`. Unknown verbs and kinds are rejected
when a role is written.

| Built-in role | Access |
|---|---|
| `admin` | every verb on every kind in the binding's namespace |
| `developer` | manage pipelines, runs, revisions, triggers, stands, artifacts, Git sources and brought resources; read agents/namespaces; read and write names of vars/secrets |
| `viewer` | get, list and watch every kind |
| `agent` | get, update and invoke agent records; used by agent credentials |
| `run` | run-scoped resource work and read-only pipeline/revision/source discovery |

Secret values are never returned, including to `admin`; permissions operate on
the record and rotation channel. Use [service accounts](../graphenectl/access.md)
for CI and revoke individual issued tokens with the account's `revoke-token`
command.

## Secrets

- Pipeline code passes `SecretRef`, never plaintext.
- Values resolve at the last responsible component: server for SSH install,
  machine worker for file/Git use.
- The mutable store uses AES-GCM under `GRAPHENE_SECRETS_KEY`.
- The key is not recoverable from the store. Back it up separately and restrict
  it to the server process.
- Temporal histories, record specs and ordinary output contain names only.

External KMS/Vault lifecycle is not shipped. If a platform requires managed key
rotation, Graphene's current secret store is not yet a complete production fit.

## Source and webhook credentials

`gitsource.credentialRef` and Git-library auth name Graphene secrets. The Git
checkout does not persist credentials in repository configuration. A webhook
should declare `HookSecret`; it validates either Bearer or HMAC-SHA256 of the
exact body.

## Machine access

The agent needs root for `runc`; actions can change the host. Grant pipeline
write/run permissions only to identities trusted to operate those machines.
Use separate namespaces and agent identities for trust domains. PTY is an
operator escape hatch, not a restricted application shell; verify
`GRAPHENE_AGENT_PTY_USER` before granting shell access.

## Before any remote deployment

1. Replace every development token and storage credential.
2. Put an HTTP/2-capable TLS proxy in front of the single door.
3. Configure OIDC and namespace bindings; test with `graphenectl whoami`.
4. Persist the secret key outside the data volume and define its backup.
5. Separate Docker/runtime hosts according to your trust model.
6. Verify telemetry and blob retention outside Graphene.

This checklist reduces obvious exposure; it does not turn the current
development distribution into a supported production topology.
