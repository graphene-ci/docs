---
sidebar_position: 2
title: Docker
sidebar_label: Docker
---

# Docker

Docker work runs on an agent's machine. `Install` and `Build` are actions;
containers, networks and volumes are owned resource records.

## Install and build

```go
report, err := activity.Activity(ctx, agent, dockerlib.Install())

build, err := activity.Activity(ctx, agent, dockerlib.Build(dockerlib.BuildSpec{
    Context:   machine.Workspace() + "/src/app",
    Tags:      []string{"registry.example/app:sha"},
    Push:      true,
    Target:    "release",
    BuildArgs: map[string]string{"VERSION": version},
    CacheFrom: []string{"type=registry,ref=registry.example/app:cache"},
    CacheTo:   []string{"type=registry,ref=registry.example/app:cache,mode=max"},
}))
```

`Install` converges an existing engine or installs one with the machine's
package manager, then publishes capability `docker`. `Build` uses the machine's
Buildx/BuildKit and returns the digest and tags. Paths must be valid on the
machine; `machine.Workspace()` is the shared same-path location.

## Container

```go
web := dockerlib.Container(ctx, agent, dockerlib.Spec{
    Name: "web",
    Config: &container.Config{Image: "nginx:alpine"},
    Host: &container.HostConfig{
        RestartPolicy: container.RestartPolicy{Name: container.RestartPolicyAlways},
    },
    Scrape: "http://localhost:9187/metrics",
}, pipeline.WithLabels(map[string]string{"role": "frontend"}))

id := web.Ready(ctx).Id
```

`Config` and `Host` are Docker's native Go types. Declaration is idempotent by
name: an absent container is created and started; a stopped one is started.
`Scrape` asks the agent to pull a Prometheus endpoint and attribute samples to
the container record.

## Network and volume

```go
net := dockerlib.Network(ctx, agent, dockerlib.NetworkSpec{
    Name: "private",
    Options: network.CreateOptions{Driver: "bridge"},
})

data := dockerlib.Volume(ctx, agent, volume.CreateOptions{Name: "db-data"})
```

Both use Docker's native option structs and converge by name. Finalize removes
the Docker object; a volume's data therefore dies with its owner. Transfer a
resource to the [stand](../concepts/resources.md#outliving-the-run) when it must
survive its run.

When the agent is owned by the run, Docker resources become its children. On
an attached agent they stay owned by the run: foreign resources cannot be made
responsible for your declarations.
