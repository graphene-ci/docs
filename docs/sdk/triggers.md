---
sidebar_position: 6
title: Triggers
sidebar_label: Triggers
---

# Triggers

Triggers are declarations in `pipeline.Main`. Publication reconciles them into
records owned by the pipeline; removing a declaration removes its record on the
next publication.

| Constructor | Starts when | Important options |
|---|---|---|
| `trigger.Cron(spec)` | a five-field cron schedule fires | `Name`, `Params` |
| `trigger.Webhook(name)` | the server receives the hook request | `HookSecret`, `Params` |
| `trigger.Upstream(pipeline)` | another pipeline finishes | `OnOutcome`, `Name`, `Params` |

## Cron

```go
trigger.Cron("0 3 * * *",
    trigger.Name("nightly"),
    trigger.Params(Params{Mode: "full"}),
)
```

Names must be unique inside one pipeline. The default cron name is `cron`.

## Webhook

```go
trigger.Webhook("push",
    trigger.HookSecret("github-hook"),
    trigger.Params(Params{Mode: "changed"}),
)
```

The endpoint is `POST /hooks/{namespace}/{pipeline}/{name}`. The request body
arrives in the `json.RawMessage` field tagged `json:"event,omitempty"`.
`HookSecret` accepts either `Authorization: Bearer <value>` or
`X-Hub-Signature-256: sha256=<HMAC-SHA256(body)>`. Without `HookSecret`, the
hook has no hook-level shared secret; normal server exposure controls still
apply.

## Upstream

```go
trigger.Upstream("baseline", trigger.OnOutcome("success"))
```

Outcomes are `success`, `failure`, or `any`; default is `success`. The event
identifies the upstream pipeline, run and outcome. Move durable payloads through
an [artifact](artifacts-secrets.md), not the event.

## Params and concurrency

Trigger params must fit the pipeline's exact `Params` type. The binary validates
them before serving, so a drifted scheduled declaration fails during
publication rather than during a future firing. `pipeline.Var` and
`pipeline.UseSecret` keep installation values out of source.

The pipeline's [concurrency policy](main.md#concurrency) arbitrates overlapping
automatic firings. `Queue` retains at most one pending firing; it is not an
unbounded job queue.
