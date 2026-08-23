---
sidebar_position: 4
title: Artifacts & secrets
sidebar_label: Artifacts & secrets
---

# Artifacts & secrets

## Artifacts

An artifact is declared with its **source** — where the bytes are is
part of the declaration; the upload is the wrapper's business (an
action on the right site under the hood):

```go
reportArtifact := pipeline.NewArtifact(ctx, "perf-report",
	artifact.FromAgentFile(bareAgent, "/var/log/perf/report.tgz"),
)
```

`artifact.FromBytes` serves bytes the run computed itself. The record
keeps the digest; the digest is computed by the server on upload — a
client cannot forge it.

An artifact made by another pipeline is attached, never created:

```go
baseline := pipeline.AttachArtifact(ctx, "baseline-report")
digest := baseline.Ready(ctx).Blob.Digest
```

## Secrets

`Secret` builds a **reference** into this pipeline's secret set — the
values are assigned to the pipeline on the server:

```go
k8sClient := k8slib.NewClientFromSecret(pipeline.Secret(ctx, "kubeconfig"),
	k8slib.WithScheme(ycapis.AddToScheme))
```

Only the name travels — in specs, logs, and history. The value
resolves inside actions at the point of use and never comes back.
