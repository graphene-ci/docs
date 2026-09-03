---
sidebar_position: 3
title: Sources and pipelines
sidebar_label: Sources & pipelines
---

# Sources and pipelines

Studio operates the server-side path from a Git commit to an active immutable
pipeline revision. Git remains the authoring system; Studio does not edit or
commit source files.

## Build and activate

1. Open **Pipelines** and add or select a Git source.
2. Synchronize it to resolve refs and discover the current commit.
3. Materialize the chosen commit. The server checks it out into managed blob
   storage; Studio streams the operation log.
4. Build the materialized source. A successful build creates an immutable
   revision and exposes its plan and input schema.
5. Start a **draft run** to test that exact revision without changing the
   pipeline's active revision.
6. Activate the revision when it is ready for normal run submission and
   triggers.

The revision list keeps older immutable builds. Roll back by activating a
previous known-good revision; do not rebuild it from a moving branch name.

## Source credentials

Private Git authentication is supplied to the server as secret references,
not embedded in a source URL or copied into a pipeline parameter. Limit the
credential to read-only repository access. The resulting source record is
read-only in Studio even when the caller can synchronize or rebuild it.

## What to inspect

For each stage, use the operation log and resulting record rather than only the
button state:

- sync failures usually concern ref resolution or credentials;
- materialization failures concern checkout, archive, or blob storage;
- build failures come from the selected runtime and source;
- a draft run failure is pipeline execution, not revision activation.

For the equivalent command-line flow, see
[`graphenectl pipeline`](../graphenectl/pipeline.md). For the server contract,
see [Source and Revisions APIs](../api/management.md#sourceapi).
