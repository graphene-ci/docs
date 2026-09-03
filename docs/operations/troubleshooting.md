---
sidebar_position: 5
title: Troubleshooting
sidebar_label: Troubleshooting
---

# Troubleshooting

Start from the record, not from Temporal internals. The shortest diagnostic
sequence is:

```console
$ graphenectl ctx show
$ graphenectl whoami
$ graphenectl get <kind>/<id> -o yaml
$ graphenectl events <kind>/<id>
$ graphenectl logs <kind>/<id> --tail 100
$ graphenectl tree <kind>/<id>
```

## Cannot connect or log in

1. Check the effective server, namespace and insecure mode with `ctx show`.
2. Check `/healthz` on the same door.
3. A TLS handshake against the plaintext dev stack needs explicit `--insecure`;
   do not use that switch to hide a broken remote TLS deployment.
4. `permission_denied` means authentication succeeded but no applicable role
   allowed `verb × kind × namespace`. Inspect `whoami`, roles and bindings.
5. `unauthenticated` means the token is missing, expired or invalid.

## Materialization fails

```console
$ graphenectl get gitsource/main -o yaml
$ graphenectl events gitsource/main
$ graphenectl revision materialize <pipeline> --source gitsource/main
$ graphenectl events revision/<id>
$ graphenectl logs revision/<id>
```

Verify the Git URL/ref/subdir, `credentialRef`, source commit and configured
runtime. A runtime needs image, build and artifact; its toolchain image must be
pullable by the server's Docker runtime. Build output belongs to the revision
record even if the watching client disconnects.

## Run is stuck or retrying

```console
$ graphenectl run status <run-id>
$ graphenectl run watch <run-id> --plain --logs all
```

`status` shows pending activity, attempt, last heartbeat and last failure. Then
inspect the named resource. Repeated `Scheduled` without a start usually means
no worker is polling its queue; a started activity with an old heartbeat points
to a lost or blocked executor.

Cancel through `run cancel`, not a hard workflow termination, so cleanup still
runs. At-most-once work may return `ErrUnknown`: investigate the external
system before deciding whether to retry manually.

## Agent does not become ready

```console
$ graphenectl get agent/edge-1 -o yaml
$ graphenectl events agent/edge-1
$ journalctl -u graphene-agent -n 200 --no-pager
```

Check that `GRAPHENE_AGENT_SERVER` is reachable from both host and executor,
the token is scoped to the same id/namespace, `runc` exists, and the machine is
not already bound to another id. A remote agent given `127.0.0.1` connects to
itself, not the server.

## No logs, metrics or traces

State and events may still work because they come from Temporal. For dimensions
3–5, verify both ingest and query URLs in server configuration. Empty ingest
accepts and drops the signal. Query the record with `-f`; then inspect server
logs for backend response codes and confirm time ranges and entity reference.

## Deletion does not finish

Deletion finalizes children first. Use `tree` and inspect the first child still
in deleting/failed state. A resource anchored to a permanently lost agent
cannot execute finalize; automatic burial is not available. Preserve evidence
before changing the external object manually.

## Development stack

```console
$ docker compose ps
$ docker compose logs --tail=200 graphene
$ docker compose logs --tail=200 temporal registry minio
$ docker compose config --quiet
```

Keep `GRAPHENE_SECRETS_KEY` stable with the data volume. A mismatched key causes
startup failure by design. On SELinux hosts the checked-in Compose stack uses
`label:disable` for the Docker socket mount.
