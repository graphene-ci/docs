---
sidebar_position: 1
title: Main
sidebar_label: Main
---

# Main

A pipeline is a program with one entry point:

```go
func main() {
	pipeline.Main("perf-nightly", run,
		pipeline.WithTriggers(
			trigger.Cron("0 3 * * *", trigger.Params(map[string]any{...})),
			trigger.Webhook("push", trigger.HookSecret("gh-hook")),
		),
		pipeline.WithConcurrency(pipeline.Queue),
	)
}

func run(ctx pipeline.Context, params Params) (Result, error) { ... }
```

`Main` takes the pipeline id, the typed function, and pipeline-level
options. The role (`run` / `machine`) and the wiring come from the
environment — the same binary serves both; see
[Execution model](../concepts/execution-model.md).

## Params and Result

The run's input and output are the function's types:

```go
// The UI form and submit validation derive from this type.
type Params struct {
	// Event receives a webhook trigger's request body (reserved name).
	Event    json.RawMessage `json:"event,omitempty"`
	FolderId string          `json:"folderId"`
	Keep     time.Duration   `json:"keep"`
}

// Small values only — big data goes through artifacts.
type Result struct {
	Report string `json:"report"`
	VmId   string `json:"vmId"`
}
```

The parameter contract is checked by the compiler, not by a
convention about strings. `Result` is what the CLI and the browser
show for a finished run.

## Context

`ctx` carries only what does not exist outside a run — the run id and
the logger. Everything that acts is a free function taking `ctx`
first: declaring resources, executing actions, building secret
references.

## Triggers

Runs start not only by hand: the pipeline declares its triggers —
a cron schedule or a webhook. Trigger params are the same typed
`Params`; a webhook's request body arrives in the reserved `Event`
field, and `HookSecret` names the secret that authenticates the
caller.

## Concurrency

The concurrency policy governs AUTOMATIC starts:

| Policy | On firing while a run is live |
|---|---|
| `Queue` (default) | defer until the live run finishes; at most one pending — cron semantics, no pile-up |
| `CancelPrevious` | cancel the live run, start the new one |
| `Parallel` | start regardless |

A manual start against a live run under `Queue` is refused with a
clear error.
