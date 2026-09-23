---
sidebar_position: 4
title: Output forms
sidebar_label: Output forms
---

# Output forms

Every read command renders through the same flags. This page shows each
form once, on real commands; the rest of the guide sticks to the
default table and names the other forms only when one is the point.

| Flag | Values | Default | What it does |
|---|---|---|---|
| `-o, --output` | `table` \| `wide` \| `name` \| `json` \| `yaml` | `table` | the shape of the answer |
| `--color` | `auto` \| `always` \| `never` | `auto` | styling; `auto` is on for a terminal and off in a pipe, a file, or with `NO_COLOR` set |
| `--jq <expr>` | a jq expression | — | pipe the JSON form through [gojq](https://github.com/itchyny/gojq); implies JSON |
| `-w, --watch` | bool | off | watch a listing: the snapshot, then only changes |
| `--chunk-size <n>` | int | `500` | list page size; the pages walk invisibly; `0` — one unpaginated request |

## `-o table` — the default

```console
$ graphenectl get run -p terminated
RUN         PIPELINE      STATUS      STARTED    TOOK   LABELS
watch-demo  perf-nightly  terminated  2h14m ago  1m48s  team=perf
val-c       perf-nightly  terminated  1d3h ago   42s
```

Rows come in a stable order — records by ref, runs newest first — and
labels in key order. The `LABELS` column shows the labels a person set;
the installation's own (`graphene.io/…`: the image, the trigger, the run)
appear with `-o wide` and in `json`/`yaml`.

## `-o wide` — more columns

Records gain the pending-commands counter and the deletion mark, and
`LABELS` carries the installation's own labels too:

```console
$ graphenectl get agent -o wide
REF           PHASE  OWNER        AGE    PENDING  DELETING  LABELS
agent/vm-e2e  ready  run/run-e2e  3m12s  0        false     graphene.io/run=run-e2e,role=e2e
```

## `-o name` — refs only, xargs-ready

```console
$ graphenectl get run -o name
watch-demo
val-c
val-b
```

```console
$ graphenectl get docker-volume -o name | xargs -I{} graphenectl delete {}
```

## `-o json`

The protojson form, stable field names. Bytes fields that carry JSON
by contract — a record's `spec` and `state`, a pipeline `manifest`,
run `params`/`result`, event payloads — decode into real objects on
the way out instead of the base64 protojson would print:

```console
$ graphenectl get run watch-demo -o json
{
  "status": "terminated"
}
```

## `-o yaml`

The same fields through the YAML mapping:

```console
$ graphenectl get run watch-demo -o yaml
status: terminated
```

## `--jq` — the scripting form

One expression over the JSON form; strings print raw (`jq -r`
behavior). On streams the expression runs per message. The embedded
fields are already decoded, so paths reach straight into them:

```console
$ graphenectl get pipeline perf-nightly --jq '.resource.state.manifest.kinds'
["docker","docker-network","docker-volume"]
```

```console
$ graphenectl get run --jq '.runs[].runId'
watch-demo
val-c
val-b
```

```console
$ graphenectl get pipeline/perf-nightly --jq .resource.state.image
localhost:7233/default/perf-nightly:4f925b8c6e5fff45
```

```console
$ graphenectl events run demo --jq 'select(.kind == "activity-failed")'
```

## `-w` — watching a listing

The first frame prints in full, then only rows that appeared, changed,
or went away (marked `deleted`). A watch reports changes, so the columns
that tick on their own (`AGE`, `STARTED`, `TOOK`) stay out of it:

```console
$ graphenectl get run -w
RUN          PIPELINE      STATUS      LABELS
watch-demo   perf-nightly  terminated
demo-2       perf-nightly  running
demo-2       perf-nightly  completed
```

`-w` composes with `-o json` and `--jq`: every change arrives as one
message.

## `--chunk-size` — pagination

Listings walk the server in pages of `--chunk-size` (default 500) —
invisibly: the pages accumulate into one reply for every output form,
`-w` included. `--chunk-size 0` asks for everything in one request.

```console
$ graphenectl get run --chunk-size 100 -o name | wc -l
1187
```

## Color

graphenectl is plain text: no screen takeover, every view pipes, greps
and scrolls. On a terminal it is styled by **meaning**:

| Color | Means |
|---|---|
| green | fine — `ready`, `completed`, a completed activity |
| yellow | moving — `creating`, `running`, a retry attempt, a warning |
| red | wrong — `failed`, `timed-out`, an error line |
| purple | stopping — `deleting`, `canceled`, `terminated` |
| gray | over or secondary — `deleted`, a kind prefix, labels, axes |

Color is a property of the destination, so a script never strips escape
codes: in a pipe or a file there are none. `--color always` forces
styling (for `less -R`), `--color never` or `NO_COLOR=1` turns it off.
Only the eight basic colors are used — they follow the terminal's theme.

A table fits the terminal by cutting its one unbounded column (labels, a
metric's series) and marking the cut with `…`; in a pipe nothing is cut.

## Exit codes

| Code | Means |
|---|---|
| `0` | done — an empty answer about something that exists included |
| `1` | the command failed: a bad flag, a refused request, the network |
| `2` | there is no such thing: `no record <ref>`, `no run <id>` |
| `3` | the command worked, the **run** did not: `run start --watch` and `run watch` of a run that ended any way but `completed` |
