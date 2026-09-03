---
sidebar_position: 4
title: Git actions
sidebar_label: Git
---

# Git actions

The Git library runs the machine's own Git. It intentionally wraps common CI
moves, not the full CLI. Execute every returned call with `activity.Activity`
or `ActivityAll`.

## Install and checkout

```go
_, err := activity.Activity(ctx, agent, gitlib.Install())
checkout, err := activity.Activity(ctx, agent, gitlib.Checkout(gitlib.Spec{
    Repository:     "https://github.com/acme/app.git",
    Ref:            "main",
    ExpectedCommit: commit,
    Depth:          1,
    Clean:          true,
    Submodules:     true,
}))
```

Default checkout directory is `<machine.Workspace()>/src/<repo>`. Reusing the
same repository fetches and resets it; another directory is removed and
cloned. `ExpectedCommit` makes a moved ref a non-retryable error.

## Read and write verbs

| Call | Required fields | Result |
|---|---|---|
| `LsRemote` | `Repository`; optional `Ref`, `Auth` | resolved commit |
| `Tag` | `Dir`, `Name`; optional `Message`, `Push`, `Auth` | name and commit |
| `Commit` | `Dir`, `Message`, author name/email; optional paths and push | commit and whether one was created |

Tagging the same commit twice and committing a clean tree are successful
no-ops. A tag pointing elsewhere is an error.

## Credentials

```go
gitlib.Auth{
    TokenSecret:  pipeline.Secret(ctx, "git-token"),
    TokenUser:    "oauth2",
    SSHKeySecret: pipeline.Secret(ctx, "git-key"),
}
```

HTTPS tokens become an ephemeral `http.extraHeader`; SSH keys use a temporary
file removed after the invocation. Credentials are references resolved inside
the action and are never written to `.git/config`. SSH currently uses
`StrictHostKeyChecking=accept-new`; use HTTPS tokens when a pre-pinned host key
is required by policy.

For an operation not wrapped here, create a named action around
`machine.Command`. Keep its input serializable and choose the execution
[guarantee](../sdk/activities.md#guarantees) explicitly.
