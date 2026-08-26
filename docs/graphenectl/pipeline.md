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

## Sources: two kinds, by what may be DONE to them

**`gitsource`** — a checkout of a ref. Files are readable and **not
writable**: editing a checkout would create local changes on top of a
commit — a tree to keep, diff and merge, which is version control, and
graphene is not one. It moves one way:

```console
$ graphenectl apply gitsource main --spec '{"pipelineId":"perf-nightly","url":"https://…","ref":"main","subdir":"full","runtime":"go"}'
$ graphenectl invoke gitsource main sync        # fetch the ref again
```

**`managedsource`** — the project's own tree. Every file is edited in
place; each write is durable and counts a generation. Three ways to
start one:

```console
# empty — files arrive by writes:
$ graphenectl apply managedsource draft --spec '{"pipelineId":"perf-nightly","runtime":"go"}'

# an editable COPY of git-sourced code (bytes are copied, provenance kept,
# nothing syncs back — a deliberate divergence, not a hidden branch):
$ graphenectl apply managedsource fix --spec '{"pipelineId":"perf-nightly","from":"gitsource/main"}'

# from a local directory — bytes travel their own channel first:
$ graphenectl source upload perf-nightly ./my-code     # prints the reference
$ graphenectl apply managedsource local --spec '{"pipelineId":"perf-nightly","upload":"<reference>"}'
```

## source — the bytes

```text
graphenectl source files <kind/id>            # list the tree
graphenectl source cat <kind/id> <path>       # read one file
graphenectl source write <kind/id> <path> [--from f]   # managed only
graphenectl source rm <kind/id> <path>                 # managed only
graphenectl source download <kind/id> [-o out.tgz]
graphenectl source upload <pipeline> <dir|file.tgz>
graphenectl source runtimes
```

The target names the source as `kind/id` (`gitsource/main`,
`managedsource/fix`) — the client never guesses which kind a bare name
belongs to. A managed tree is stored file by file (content-addressed
blobs plus an immutable index), so a write stores one blob and one
index — never a repack of the whole project.

Generations come free from that: the record keeps its recent history,
and going back moves **forward** — the old tree becomes a new
generation:

```console
$ graphenectl get managedsource/fix -o json --jq .resource.state.generation
4
$ graphenectl invoke managedsource fix revert --data '{"generation":2}'
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
