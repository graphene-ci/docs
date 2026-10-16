---
sidebar_position: 2
title: Docker
sidebar_label: Docker
---

# Docker

Docker work runs on an agent's machine. `Install`, `Build` and `Job` are
actions; containers, networks and volumes are owned resource records.

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

The upstream installer is limited to three minutes, including child downloads;
on failure or timeout, installation falls back to the distribution package.
APT waits up to 120 seconds for a package lock held by another installer,
including unattended upgrades on fresh machines. The timeout is passed through
a temporary per-invocation configuration, inherited by the upstream installer
and fallback. Existing APT settings are preserved, and the temporary file is
removed on exit. Running package managers and their lock files are left intact.

`Install` sends a heartbeat immediately and every 15 seconds through engine
installation and capability publication. Keep a heartbeat timeout longer than
that interval (for example one minute), alongside a longer installation timeout.
If a connection loses the completion report, the activity can retry after the
heartbeat timeout; an existing engine is reused.

## Container

```go
web := dockerlib.Container(ctx, agent, dockerlib.Spec{
    Name: "web",
    Config: &container.Config{Image: "nginx:alpine"},
    Host: &container.HostConfig{
        RestartPolicy: container.RestartPolicy{Name: container.RestartPolicyAlways},
    },
    Scrape:      "http://localhost:9187/metrics",
    ScrapeEvery: 10 * time.Second,
}, pipeline.WithLabels(map[string]string{"role": "frontend"}))

id := web.Ready(ctx).Id
```

`Config` and `Host` are Docker's native Go types. Declaration is idempotent by
name: an absent container is created and started; a stopped one is started.
`Scrape` asks the executor to pull a Prometheus endpoint and attribute samples
to the container record. It is pulled from the container's start every
`ScrapeEvery` — 15 seconds when unset, never under one second — on its own
step, apart from the 30-second beat that samples docker stats. Samples are
shipped as read, every point at the scrape's own time, and a series ends when
its exporter does — `rate()` over a scraped counter sees the source's clock.
Families keep the shape Prometheus stores them in, with their labels unchanged:

| Family | Shipped as |
|---|---|
| counter | counter |
| gauge, untyped | gauge |
| histogram | `<name>_bucket{le}` (cumulative, `le="+Inf"` included), `<name>_sum`, `<name>_count` — counters |
| gauge histogram | `<name>_bucket{le}`, `<name>_gsum`, `<name>_gcount` — gauges |
| summary | `<name>{quantile}` — gauges; `<name>_sum`, `<name>_count` — counters |

So `histogram_quantile(0.99, rate(sql_service_latency_bucket[1m]))` works over
a scraped exporter as over any Prometheus. The scrape asks for the text
exposition; native (sparse) histograms exist only in the protobuf one, so an
exporter's classic buckets are what ships, and a native-only histogram ships
its `_sum`, `_count` and the `+Inf` bucket. A NaN or infinite value — a
summary quantile before its first observation — is not a reading and is left
out. A failing endpoint is a warning in the record's log once per distinct
failure, not every step. The beat's own `docker.container.cpu.percent` and
`docker.container.memory.bytes` are gauges of its moment.

### Logs and the container's last words

The executor follows every container's log as a stream from the moment it
starts: each line reaches the record's logs within about a second, with
`stream=stdout|stderr`. A broken stream — the daemon or the container
restarting — is picked up from the last line shipped, with no line twice and
none missed. When a container stops on its own, the stop is in the record's
history (`container-exited` with the exit code) the moment its log ends.

Before a container is removed it is retired: a last stats and scrape sample,
then `docker stop` with a 10-second grace — SIGTERM, so the process flushes
what it buffers (an OpenTelemetry SDK's last spans and metrics, a database's
last log lines) — and everything it wrote after the last line shipped is read
and shipped. The retirement is bounded to 20 seconds; a daemon that does not
answer does not hold the teardown.

### Telemetry from inside the container

A container and a job get `OTEL_EXPORTER_OTLP_ENDPOINT` (and
`OTEL_EXPORTER_OTLP_INSECURE=true`) in their environment unless the spec sets
the endpoint itself. It points at the executor's local OTLP intake — on the
docker bridge, or on the loopback for a container on the host network — which
stamps the run on everything that arrives and forwards it into Graphene. A
tool that speaks OpenTelemetry (a test suite, stroppy) reports into the run's
logs, metrics and traces with no configuration; the container never sees the
server's address or a token. See [observability](../concepts/observability.md).

## Job

A job runs a container **to completion** — the one-shot counterpart of
`Container`. It is an action, not a resource: nothing is owned, nothing stays on
the machine but the log file.

```go
report, err := activity.Activity(ctx, agent, dockerlib.Job(dockerlib.JobSpec{
    Name: "infra-tests",
    Config: &container.Config{
        Image: "ghcr.io/astral-sh/uv:python3.12-bookworm-slim",
        Cmd:   []string{"uv", "run", "/work/test_infra.py"},
        Env:   []string{"FIO_SIZE=1G"},
    },
    Host: &container.HostConfig{
        NetworkMode: "host",
        Mounts: []mount.Mount{{Type: mount.TypeBind, Source: "/opt/demo", Target: "/work"}},
    },
}), activity.WithGuarantee(activity.AtMostOnce))
```

The spec is the same pair of Docker types `Container` takes; a job adds no
vocabulary of its own. Files reach the container the Docker way — a bind mount
of a directory on the machine. Put them there with a [file resource](./file.md)
(`file.FromEmbed` carries a script inside the pipeline binary), and read what
the job wrote into the mount with `artifact.FromAgentFile`.

| Report field | Meaning |
|---|---|
| `ExitCode` | the container's exit status |
| `Stdout` | stdout alone, first 256 KiB — for a machine-readable answer |
| `Tail` | the end of merged stdout+stderr, last 16 KiB — a summary or an error |
| `LogPath` | full merged output on the machine — hand it to an artifact |

A non-zero exit code is an **outcome**, not an activity failure: the job ran,
the pipeline decides what its status means. The activity fails only when the
container could not be run at all; when the image is missing, the error carries
the failed pull's own cause.

Every output line is also a log record of the run (`graphenectl logs run <id>`),
stamped with the job's name and the `stream` it came from. Stdout and stderr
assemble their lines separately, so an unfinished line of one never splices
into the other; the log file and `Tail` stay the merged output as Docker
delivered it. The stream is **not** a severity — plenty of tools log ordinary
progress to stderr, and pytest prints its failures to stdout — so every line is
recorded at the same level. What does carry a severity is the job's own word: a
non-zero exit adds one **warning** record, `job <name> exited with status <n>`.

The job replaces a leftover container of the same name and removes its own
container on every exit path, cancellation included; `AutoRemove` is cleared so
the exit status is never lost to Docker's own removal. Whether a second
execution is acceptable is the caller's knowledge — a job that loads data or
sends a message wants `AtMostOnce`.

In [local tests](../sdk/testing.md) a job has no default outcome — what a
container prints is the test's own data:

```go
dockertest.OnJob(world, "runner-1", "infra-tests").
    Return(dockerlib.JobReport{Stdout: "{\"ok\":true}\n"}, nil).Once()
```

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

## Local tests

See [Local tests](../sdk/testing.md) for fixtures, dependency adapters and pipeline assertions.
