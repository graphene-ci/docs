---
sidebar_position: 3
title: Connection flags
sidebar_label: Connection flags
---

# Connection flags

Every network command takes these three. They pick **where** the
command talks and **as whom**; the [output forms](outputs.md) pick how
the answer renders.

| Flag | Type | Default | What it does |
|---|---|---|---|
| `--context <name>` | string | the config's `current` | use this named context for one call |
| `--config <path>` | string | `$GRAPHENE_CONFIG`, else `~/.config/graphene/config.yaml` | read contexts from this file |
| `-n <namespace>` | string | the context's namespace | namespace for one call — meaningful for cluster-wide admin tokens (`*`); a namespaced token is pinned to its own scope by the server |

## Examples

One call against another installation without switching:

```console
$ graphenectl get run --context prod
```

A CI job with its own config file:

```console
$ graphenectl run list --config ./ci/graphene.yaml
```

An admin token surveying another namespace:

```console
$ graphenectl get all -n team-b
```

The full resolution chain — file, context, environment overrides — is
described in [Contexts](contexts.md).
