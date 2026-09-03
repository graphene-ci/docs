---
sidebar_position: 1
title: Pipeline binary commands
sidebar_label: Binary commands
---

# Pipeline binary commands

Every program using `pipeline.Main` exposes the same four command names. The
binary knows its own params and manifest; `graphenectl` remains the generic
operator client.

| Command | Purpose | Server required |
|---|---|---|
| `plan` | record and render the optimistic execution plan | no |
| `push` | build the current binary, push its image and publish its manifest | yes |
| `run` | push if changed, then start this pipeline | yes |
| `dev` | reserved local loop; currently returns an error | — |

## plan

```text
go run . plan [-o text|json|mermaid]
```

The recording pass discovers unconditional declarations and actions. It does
not execute work or evaluate branches that depend on runtime values. Use JSON
for tooling and Mermaid for a reviewable diagram.

## push

```text
go run . push [--context <name>]
```

Self-build targets Linux/amd64, uses the selected connection context, and does
not require a local Docker daemon. The image tag follows the binary digest;
unchanged content is reused. The command then publishes the image reference and
typed manifest to the pipeline record.

## run

```text
go run . run [--context <name>] [--params <json>] [--label k=v] [--watch]
```

Exported fields of a struct `Params` become flags named by their JSON tags.
Strings, booleans, integers, floats and `time.Duration` get native flags; a
compound value accepts JSON. `--params` replaces field flags with one raw
object.

```console
$ go run . run --folderId f1 --keep 30m --watch
$ go run . run --params '{"folderId":"f1","keep":"30m"}'
```

`--watch` prints status transitions, prints the typed result on success and
mirrors the run outcome in the process exit code. For richer inspection use
[`graphenectl run watch`](../graphenectl/run.md#run-watch).

Connection resolution is shared with `graphenectl`; see
[Contexts](../graphenectl/contexts.md). `--dev` is accepted only to report that
the embedded development loop is not implemented.
