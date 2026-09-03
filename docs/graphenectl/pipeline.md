---
sidebar_position: 10
title: "pipeline, sources, revisions"
sidebar_label: pipeline & sources
---

# pipeline, sources, revisions

A **pipeline is the project**: the root of its ownership tree, the
arbiter of its runs, and the holder of the version automatic starts
use. Everything under it is records:

```console
$ graphenectl tree pipeline/perf-nightly
pipeline/perf-nightly
  gitsource/nightly-main (ready)
  trigger/perf-nightly.push (ready)
  trigger/perf-nightly.cron (ready)
  revision/perf-nightly.a9bf6299f2d5b3b3 (ready)
```

The pipeline itself, its sources and its revisions are read and managed
with the generic verbs — `apply`, `get`, `invoke`, `delete`. What lives
under `source` and `revision` below is only what those verbs cannot
carry: bytes and streams.

## Git sources

**`gitsource`** — a checkout of a ref. Files are readable and **not
writable**: editing a checkout would create local changes on top of a
commit — a tree to keep, diff and merge, which is version control, and
graphene is not one. It moves one way:

```console
$ graphenectl apply gitsource main --spec '{"pipelineId":"perf-nightly","url":"https://github.com/acme/perf.git","ref":"main","subdir":"full","runtime":"go"}'
$ graphenectl invoke gitsource main sync        # fetch the ref again
```

`credentialRef` may name a Graphene secret for a private repository. Only the
secret name is recorded; the value is resolved while fetching.

Git sources are read-only in Graphene. Studio and
`graphenectl source files/cat` expose the checkout for inspection. Edit code in
its source repository, move the Git ref, then invoke `sync`.

## Local source upload

A local directory can be materialized without declaring a source record. This
is the development path used by `revision materialize --upload`:

```console
$ graphenectl revision materialize perf-nightly --upload ./my-code
```

`graphenectl source upload perf-nightly ./my-code` is the lower-level byte
channel: it stores a tarball and prints a reference. It does not create a
source record by itself.

## source — the bytes

```text
graphenectl source files <kind/id>            # list the tree
graphenectl source cat <kind/id> <path>       # read one file
graphenectl source download <kind/id> [-o out.tgz]
graphenectl source upload <pipeline> <dir|file.tgz>
graphenectl source runtimes
```

The target names the source as `kind/id` (`gitsource/main`) — the client never
guesses which kind a bare name belongs to. `source runtimes` lists what this
installation can build. Go 1.26 is built in; administrators may add build
runtimes explicitly, but that does not provide another language's Graphene
SDK.

Each successful Git fetch updates the source record's resolved commit, tree
digest, and generation:

```console
$ graphenectl get gitsource/main -o json --jq .resource.state.generation
4
```

## revision — build and draft-run

```text
graphenectl revision materialize <pipeline> [--source kind/id] [-f dir]
graphenectl revision run <pipeline> <revision> [--params JSON]
```

`materialize` builds a source into an immutable revision **on the
server** (an ephemeral toolchain container; the build is the revision
record's own Init, so it survives the client hanging up — the command
only watches the stream). With one source it is picked by default; with
several the server refuses to guess — name one with `--source`. `-f`
uploads a local directory instead, declaring nothing.

`run` starts a **draft** of any revision, active or not — validated
against that revision's own manifest, executed with its image.

**Activation** is the pipeline's own command, not a revision verb:

```console
$ graphenectl invoke pipeline perf-nightly activate --data '{"revisionId":"a9bf6299f2d5b3b3"}'
```

The record resolves the manifest from the blob store itself, reconciles
its triggers and the kind dictionary, and remembers `revisionId` — so
`get pipeline/x` names the active revision, and rollback is activating
an older one. Listing revisions is the generic listing:

```console
$ graphenectl get revision --owner pipeline/perf-nightly
```
