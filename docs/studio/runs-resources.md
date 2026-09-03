---
sidebar_position: 4
title: Runs and resources
sidebar_label: Runs & resources
---

# Runs and resources

Studio presents the same generic record model as `graphenectl`: a run owns a
tree of resources, every record has state and history, and available operations
come from its kind and the caller's permissions.

## Start and follow a run

Open a pipeline, choose the active revision, and fill the generated typed form.
Studio obtains this form from the revision schema; it does not keep a separate
copy of pipeline parameters. Submit the run, then use:

- **trace** for execution progress and dependencies;
- **owned tree** for everything created under the run;
- **rerun** to submit the same pipeline inputs again;
- **cancel** to request cancellation of an active run.

Cancellation is asynchronous. Keep following the run until it reaches a
terminal outcome; the worker still needs to finalize the owned resource tree.

## Inspect a record

Selecting a run, resource, agent, artifact, or system record opens the generic
inspector. Depending on its kind and permissions, it provides:

| View | Use |
|---|---|
| State | Current spec, outputs, phase, owner, and labels |
| Events | Ordered lifecycle and reconciliation history |
| Logs | Filtered record logs and live tail |
| Metrics | Charts from the configured metrics query backend |
| Traces | Spans from the configured trace query backend |
| Download | Artifact or other downloadable record payload |
| Commands | Kind-defined operational commands |

Transfer and delete are ownership operations, not UI shortcuts. Transfer moves
the selected record subtree to another owner. Delete asks Graphene to finalize
that subtree. Both remain subject to server authorization and resource-kind
rules.

## Topology and terminal

**Topology** combines ownership with explicitly declared data and control flow;
it does not infer hidden network dependencies. **Terminal** opens an
interactive session on a connected agent. Terminal access is privileged: use a
least-privilege token, verify the selected installation and agent, and close
the session when the task is complete.

If a view is empty, distinguish “the record emitted no data” from “the query
backend is not configured.” Use the
[troubleshooting map](../operations/troubleshooting.md) and
[observability model](../concepts/observability.md) to identify the layer.
