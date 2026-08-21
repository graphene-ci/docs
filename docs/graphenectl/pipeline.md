---
sidebar_position: 10
title: pipeline
sidebar_label: pipeline
---

# pipeline

```text
graphenectl pipeline show <pipeline-id>
```

Reads the pipeline record: the current worker image, the manifest's
digest, and the manifest itself — what the binary IS, as published by
its last `push` (and refreshed on every worker start, deduplicated by
content).

```console
$ graphenectl pipeline show perf-nightly
pipeline perf-nightly
image    localhost:7233/default/perf-nightly:4f925b8c6e5fff45
digest   sha256:1fd08944b517…
manifest {"pipelineId":"perf-nightly","paramsSchema":{...},"activities":[...],"kinds":[...]}
```

The scripting forms:

```console
$ graphenectl pipeline show perf-nightly --jq .image
localhost:7233/default/perf-nightly:4f925b8c6e5fff45
```

The record is also an ordinary entity — its version history is its own
event log:

```console
$ graphenectl get pipeline perf-nightly     # the record with spec/state
$ graphenectl events pipeline perf-nightly  # every manifest publication
```
