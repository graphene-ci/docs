---
sidebar_position: 3
title: Actions
sidebar_label: Actions
---

# Actions

An action is a function addressed to an agent and executed on its
machine. The verb is a **Call** — a named body with a bound argument;
the same value serves one agent and a whole set.

## Declaring inline

Name and body live right where they are needed; arguments travel only
through the binding — explicit and serializable:

```go
report, err := pipelineactivity.Activity(ctx, bareAgent,
	pipelineactivity.ActivityFn(
		"run-work",
		func(ctx context.Context, work string) (string, error) {
			out, err := machine.Command(ctx, "/bin/sh", "-c", work).CombinedOutput()
			return string(out), err
		},
		params.Work,
	),
)
```

The body executes in the machine container. `machine.Command` uses the host's
shell and `nsenter` to enter the host filesystem and mount namespace. The host
needs util-linux; the executor image needs no shell. `exec.Cmd.Dir` is preserved,
and a Docker socket path under `/host` is translated to its host path. Mounts
created by commands are visible to host services such as Docker.
Declare actions unconditionally (not behind branches on runtime
values): the recording pass sees the zero-value path.

## Fan-out

"Run it on all who are marked": select agents by labels, then one call
on every agent in parallel. Results align with targets; failures are
joined into one error naming each agent:

```go
edges, err := pipeline.SelectAgents(ctx,
	pipeline.WithLabels(map[string]string{"role": "edge"}))
...
installReports, err := pipelineactivity.ActivityAll(ctx, edges, dockerlib.Install())
```

A library verb is the same `Call` value — `dockerlib.Install()` works
in `Activity` and `ActivityAll` alike.

## Guarantees

Every action has an execution guarantee:

- **At-least-once** (default): converging work, retried by policy —
  write the body idempotent.
- **At-most-once**: one-shot work, never retried; an undeterminable
  outcome surfaces as `ErrUnknown` — never as a second execution.

```go
pipelineactivity.Activity(ctx, agent, call,
	pipelineactivity.WithGuarantee(pipelineactivity.AtMostOnce),
	pipelineactivity.WithTimeout(5*time.Minute),   // bounds one execution (default 10m)
	pipelineactivity.WithHeartbeat(30*time.Second), // "still running" vs "died"
)
```
