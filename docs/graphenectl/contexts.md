---
sidebar_position: 2
title: Contexts
sidebar_label: Contexts
---

# Contexts

A context names one installation: the door address, the token, the
namespace. Contexts live in one file shared by `graphenectl` **and**
every pipeline binary (`push`/`run` resolve the same way) — the
repository never carries tokens.

## Resolution chain

kubeconfig's shape, three layers:

1. **The file**: `--config <path>`, else `$GRAPHENE_CONFIG`, else
   `~/.config/graphene/config.yaml` (written with mode `0600`).
2. **The context**: an explicit `--context <name>`, else
   `$GRAPHENE_CONTEXT`, else the file's `current`.
3. **Field overrides on top** — the same wire names the worker roles
   speak: `$GRAPHENE_ADDRESS`, `$GRAPHENE_TOKEN`, `$GRAPHENE_NAMESPACE`,
   `$GRAPHENE_INSECURE`.

With a server and a token in the environment **no file is needed at
all** — the synthetic context is named `env`. That is the CI mode:

```console
$ GRAPHENE_ADDRESS=ci:7233 GRAPHENE_TOKEN=$CI_TOKEN graphenectl run list
```

An explicitly named context must exist — the environment never papers
over a typo in `--context`.

## login — the one-step setup

```text
graphenectl login --server host:port (--token-stdin | --token <t>)
                  [--name <ctx>] [--namespace <ns>] [--insecure]
                  [--base-image <ref>]
```

| Flag | Default | What it does |
|---|---|---|
| `--server` | required | the installation's single door, host:port |
| `--token-stdin` | — | read the token from stdin (preferred: no shell history) |
| `--token` | — | the token inline |
| `--name` | the server's host | the context's name |
| `--namespace` | the token's own scope | namespace to work in |
| `--insecure` | off | plaintext connection (dev contours) |
| `--base-image` | built-in | base image override for self-built worker images |

`login` performs a `Whoami` handshake **before** writing anything: a
bad server or token never lands in the file. A namespaced token pins
the context to its own namespace; a cluster-wide token (`*`) keeps your
`--namespace` pick (or asks). The context becomes current.

```console
$ echo dev-run-token | graphenectl login --server localhost:7233 --insecure --token-stdin --name demo
logged in: context demo, role run, namespace default (current)
```

### Interactive login

On a terminal `login` asks only for the **missing** pieces — any flag
silences its question. The token goes through hidden input: it never
echoes and never lands in the shell history. The first connection
attempt is honest TLS; plaintext happens only after an explicit yes:

```console
$ graphenectl login
server (host:port): localhost:7233
token:
verifying…
TLS handshake with localhost:7233 failed: http: server gave HTTP response to HTTPS client
retry over plaintext? — dev contours only [y/N]: y
✓ role admin, namespace *
namespace to work in [default]: team-b
context name [localhost]: dev
logged in: context dev, role admin, namespace team-b (current)
```

The namespace question appears only for a cluster-wide token — a
namespaced one pins itself. Reusing an existing context name that
points at a different server asks before overwriting. Off a terminal
nothing ever prompts: missing pieces fail with the usual errors, so CI
never hangs.

## ctx — managing contexts

```text
graphenectl ctx list | show | current
graphenectl ctx use <name>
graphenectl ctx set <name> --server host:port [--token-stdin] ...
graphenectl ctx delete <name> | rename <old> <new>
```

Every verb honors `--config`.

### list

```console
$ graphenectl ctx list
   NAME       SERVER          NAMESPACE
*  dev-admin  localhost:7233  default
   dev        localhost:7233  default
```

The `*` marks the current context.

### show — the EFFECTIVE connection

`show` prints what a command would actually use: the file **plus** the
environment overlays. The token prints masked, always:

```console
$ graphenectl ctx show
context   dev-admin
config    /home/me/.config/graphene/config.yaml
server    localhost:7233
namespace default
insecure  true
token     dev-…en
```

### current

The bare name, for scripts:

```console
$ graphenectl ctx current
dev-admin
```

### use

```console
$ graphenectl ctx use dev
current context: dev
```

### set — create or update

`set` changes **only the flags you pass**; an update keeps the rest.
The very first context in a file becomes current automatically; `--use`
makes any set current.

| Flag | What it does |
|---|---|
| `--server` | the door, host:port (required on create) |
| `--token-stdin` / `--token` | the token (stdin preferred) |
| `--namespace` | the context's namespace |
| `--insecure` | plaintext connection |
| `--base-image` | base image for self-built worker images (air-gapped installations mirror their own) |
| `--use` | also switch to it |

```console
$ echo $TOKEN | graphenectl ctx set prod --server prod.example:7233 --token-stdin --namespace team --use
context prod created
```

### delete, rename

```console
$ graphenectl ctx rename prod production
context prod -> production
$ graphenectl ctx delete production
context production deleted
```

Deleting the current context clears `current`; the next command will
ask you to pick one.
