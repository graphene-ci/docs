---
sidebar_position: 4
title: First development run
sidebar_label: First development run
---

# First development run

This path runs the minimal example against the development stack and an
existing SSH-reachable Linux machine. The machine needs `curl`, a supported
service manager, and an SSH account allowed to install the agent. Its host key
is required; Graphene never uses trust-on-first-use.

## 1. Start the control plane

Follow [Development installation](../operations/development-installation.md),
then verify the context:

```console
$ graphenectl whoami
$ graphenectl get namespace
```

If the target machine is remote, set `GRAPHENE_SERVER_EXTERNAL` to an address
it can reach before starting Compose. The agent opens an outbound connection;
no inbound agent port is needed.

## 2. Store the SSH key

The example accepts a secret name, never private-key bytes:

```console
$ graphenectl secret set bare-ssh-key --value-file ~/.ssh/id_ed25519
$ graphenectl get secret bare-ssh-key
```

The value cannot be read back. Rotation creates another event on the same
secret record.

## 3. Inspect and publish the pipeline

```console
$ git clone https://github.com/graphene-ci/examples.git
$ cd examples/minimal
$ go run . plan
$ go run . push
```

`push` cross-compiles this `main`, creates its worker image without a local
Docker daemon, pushes it through the server door, and publishes the typed
manifest. Repeating it with unchanged code reuses the content-addressed image.

Verify what landed:

```console
$ graphenectl get pipeline baseline
$ graphenectl tree pipeline/baseline
```

## 4. Start and watch

The development stack contains an agent credential for `vm-1`. Use that record
name and the SSH host's exact public key:

```console
$ go run . run \
    --host 192.0.2.40:22 \
    --user root \
    --hostKey 'ssh-ed25519 AAAA...' \
    --agent vm-1 \
    --key bare-ssh-key \
    --work 'uname -a' \
    --keep 10m \
    --watch
```

The binary pushes only if its content changed, installs the outbound agent by
SSH, executes `work` on the machine, publishes `artifact/baseline-report`, and
prints the typed result. `--watch` exits non-zero when the run fails.

In another terminal:

```console
$ graphenectl get run -w
$ graphenectl run status <run-id>
$ graphenectl tree run/<run-id>
```

Use `run status` for the current activity and retry reason; use `run watch` for
the changing tree, events, and log tail.

## 5. Inspect and clean up

```console
$ graphenectl get artifact baseline-report
$ graphenectl tree pipeline/baseline
$ graphenectl delete pipeline baseline --wait
```

Deletion follows ownership: children finalize before their owner, and records
remove the bytes they own. The example's `Keep` sleep delays completion; cancel
the run with `graphenectl run cancel <run-id>` if you do not want to wait.

## Alternative: Git source and revision

Production-shaped source flow is server-side and immutable:

1. `apply gitsource` with repository, ref, subdirectory, and runtime;
2. `revision materialize` to build a revision;
3. `revision run` to test the draft;
4. `invoke pipeline ... activate` to make it current.

The exact commands are in [Pipelines, sources and revisions](../graphenectl/pipeline.md).
The two publication paths create the same pipeline contract; choose direct
`push` for local development and Git materialization for controlled source.

Next: [write a pipeline](../sdk/main.md), understand
[resource ownership](../concepts/resources.md), or open
[Studio](../studio/index.md).
