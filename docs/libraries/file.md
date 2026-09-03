---
sidebar_position: 3
title: File
sidebar_label: File
---

# File

A file resource writes bytes onto an agent's machine during initialization and
removes the file during finalize. It is the inverse of an artifact, which reads
bytes from a machine into the blob store.

```go
cfg := filelib.File(ctx, agent, "/etc/myapp/config.json",
    file.FromBytes(raw),
    pipeline.WithLabels(map[string]string{"app": "myapp"}),
)
path := cfg.Ready(ctx).Path
```

Exactly one source is required:

| Source | Resolution |
|---|---|
| `file.FromBytes(b)` | inline bytes held by the run; use for small content |
| `file.FromEmbed(fs, path)` | bytes compiled into the pipeline with `go:embed` |
| `file.FromSecret(name)` | secret value resolved on the target machine |
| `file.FromArtifact(name)` | blob of an existing artifact record |

Secret bytes never enter the resource spec or workflow history. Artifact bytes
stream from the server's blob store. The default file mode is `0644`; the
current public constructor does not expose a mode option.

An owned agent automatically owns its files. A file on an attached agent is
owned by the run and is still removed when the run ends unless transferred.
Parent directories are created as `0755`; finalize removes the file, not empty
parent directories.
