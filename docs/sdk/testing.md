---
sidebar_position: 9
title: Local tests
sidebar_label: Local tests
---

# Local tests

`github.com/graphene-ci/pipeline/pkg/pipelinetest` attaches a Graphene contract
simulator to `go.temporal.io/sdk/testsuite.TestWorkflowEnvironment`. Run the real
pipeline function with typed inputs, fixtures for external state, and assertions
on both its result and its resources. No Graphene server, Docker daemon,
Kubernetes cluster, cloud account or host shell is needed.

## Install

Add the SDK and the adapters your pipeline uses to its Go module:

```bash
go get github.com/graphene-ci/pipeline@v0.2.0
go get github.com/graphene-ci/library/docker@v0.2.0
go get github.com/graphene-ci/library/k8s@v0.2.0
```

The adapters are packages inside their library modules; they have no separate
module versions. Tests work with published dependencies without a local workspace.

## A complete test

```go
package report

import (
    "testing"
    "time"

    "github.com/graphene-ci/pipeline/pkg/artifact"
    "github.com/graphene-ci/pipeline/pkg/pipeline"
    "github.com/graphene-ci/pipeline/pkg/pipelinetest"
    "github.com/stretchr/testify/require"
    "go.temporal.io/sdk/testsuite"
)

func run(ctx pipeline.Context, text string) (pipeline.ArtifactState, error) {
    report := pipeline.NewArtifact(ctx, "report", artifact.FromBytes([]byte(text)))
    state := report.Ready(ctx)
    pipeline.ToStand(ctx, report, pipeline.KeepFor(time.Hour))
    return state, nil
}

func TestReport(t *testing.T) {
    var suite testsuite.WorkflowTestSuite
    env := suite.NewTestWorkflowEnvironment()
    world := pipelinetest.Install(t, env)
    wf := pipelinetest.Workflow(world, "report", run)

    env.ExecuteWorkflow(wf, "benchmark passed")
    require.NoError(t, env.GetWorkflowError())
    var result pipeline.ArtifactState
    require.NoError(t, env.GetWorkflowResult(&result))
    content, found := world.Blob(result.Blob)
    require.True(t, found)
    require.Equal(t, "benchmark passed", string(content))
    world.AssertOwner(t, "artifact/report", "stand/report")
    world.AssertNoLeaks(t)

    world.Advance(time.Hour)
    record, found := world.Resource("artifact/report")
    require.True(t, found)
    require.Equal(t, "deleted", record.Phase)
}
```

The wrapper and cleanup interceptor are shared with `pipeline.Main`. Parameter
validation, `Ready` failures, cancellation and cleanup therefore use the same
pipeline code. Create a new environment and world for every test; independent
worlds support `t.Parallel()`.

## Activities and agents

Configure fixtures, install library adapters, then call `pipelinetest.Workflow`.
Preparation discovers activity signatures through the normal recording pass.
After preparation, set mocks and execute the workflow.

```go
world.ConnectAfter("bare-1", time.Second)
world.File("bare-1", "/var/log/perf/report.tgz", []byte("fixture content"))
world.SeedArtifact("baseline-report", []byte("baseline"))

wf := pipelinetest.Workflow(world, "perf-nightly", run)
world.OnAgentActivity("bare-1", "run-work", mock.Anything, params.Work).
    Return("benchmark passed", nil).
    Once()

env.ExecuteWorkflow(wf, params)
env.AssertExpectations(t)
```

`OnAgentActivity` uses Temporal's mock argument convention, including the activity
context as the first argument. It distinguishes the same activity on different
agents. Ordinary `env.OnActivity` also works for user activities. An activity
without a replacement fails with `UnmockedActivity`; its discovered production
body is never called. Explicitly registering a replacement on `env` is an opt-in
to executing that replacement.

`ConnectAfter` only connects an identity. The pipeline must still declare its
resource. `SeedAgent` instead supplies an existing foreign record for attach and
selection. `Disconnect`, `PublishCapability` and `FailResource` can change fixtures
from `env.RegisterDelayedCallback` callbacks. Labels and capability needs are
evaluated against the world's current state; creating agents are not selected.

User activity retries remain Temporal retries. `AtMostOnce` keeps one attempt and
classifies a timeout as `pipeline.ErrUnknown`, which the pipeline can handle.
`env.CancelWorkflow`, signals and delayed callbacks keep their normal testsuite
behavior. Use `world.SetDataConverter` when configuring a custom payload converter
so both the environment and simulated results use it.

## Docker and Kubernetes adapters

Install adapters before preparing the pipeline:

```go
dockertest.Install(world, "28.5.2")
objects := k8stest.Install(world)
```

Imports are `github.com/graphene-ci/library/docker/dockertest` and
`github.com/graphene-ci/library/k8s/k8stest`.

The Docker adapter models containers, volumes and networks, preserves their
native specs and flows, and returns deterministic fixture identifiers. Its
`docker.install` handler publishes a Docker capability. Override an installation
for one agent with `OnAgentActivity` to test a failure; a mocked failure does not
publish the capability.

The Kubernetes adapter accepts native Go objects or maps. The key is the exact
Graphene reference (`k8s.<group>.<version>.<Kind>/<id>`; namespaced ids are
`<namespace>.<name>`). Supply observed fields with `objects.Set(ref, live)` or
`objects.After(delay, ref, live)` and check the returned error. Omitted fields are
taken from the declared manifest. The adapter executes the kind's real
`WithReady` predicate with its polling interval and timeout. A pending or missing
fixture does not become ready automatically. Crossplane reference resolution and
provider-generated ids must be represented by fixtures.

## Assertions and lifetime

| Surface | What it checks or returns |
|---|---|
| `Resource(ref)` | Detached record including owner, phase, spec, state, agent and flows |
| `Calls()` | Dispatched activity names, queues, serialized arguments and virtual times |
| `Events()` | Declaration, readiness, transfer and deletion order |
| `Outcome("run/test-<pipeline>")` | Cleanup outcome: success, failure or canceled |
| `AssertOwner(t, ref, owner)` | The resource is live under the expected owner |
| `AssertNoLeaks(t)` | No orphan, cycle or survivor under a completed run |
| `Advance(duration)` | Advance modeled stand TTL after the root workflow completes |

`ToStand` moves the root of the declared dependency tree, matching the server's
stand transfer rule. A point transfer through `Children` only reparents that
child. Cleanup deletes resources still owned by the run. Explicitly transferred
survivors remain even if later pipeline code fails. Foreign fixtures are never
adopted or deleted by cleanup. Deleted records remain inspectable. Blob content
is removed when no live artifact in the world references it.

`Advance` is cumulative and only available after workflow completion. It advances
the model, not a real stand workflow. During a workflow, use Temporal timers and
callbacks. `Calls` records dispatches, not each retry attempt; use Temporal mock
expectations or activity listeners to assert attempts.

## Full example and development checkouts

`examples/full/main_test.go` exercises the unchanged `run` function with two
agents, typed Crossplane status, Docker, artifacts, flows and stand transfers.
It covers success, work failure, cancellation while waiting for the VM, VM
creation failure, failed Docker installation, and a missing foreign artifact. The last case deliberately retains resources already
handed to the stand before the failure.

To test the released example with its pinned dependencies:

```bash
git clone --branch full/v0.1.0 https://github.com/graphene-ci/examples.git
cd examples/full
GOWORK=off go test -race ./...
GOWORK=off go run . plan
```

For development across unpublished SDK and library changes, clone `pipeline`,
`library` and `examples` as sibling directories, then run:

```bash
cd examples
make configure
make test
make lint
cd full
go run . plan
go test -race ./...
```

`configure` creates an ignored local `go.work` pointing to those checkouts and
installs pinned tools into the repository's `bin/`. This setup leaves the versions
in `go.mod` unchanged. The library repository has equivalent
`configure`, `test` and `lint` targets covering all its modules.

## Verification boundary

The simulator runs pipeline code and models service contracts. It does not run
the Graphene control plane, agent processes, Kubernetes controllers, Docker
containers, stand workflows or a Temporal service. Simulated service activities
use workflow coroutines and virtual timers; their transport retries and
heartbeats are not reproduced. User activities use normal Temporal testsuite
execution and mocks.

Network flows are declarations, not connectivity checks. Telemetry delivery,
secret resolution, cron/webhook admission, cross-pipeline managed runs,
`ContinueAsNew`, visibility consistency and worker crash recovery need separate
tests against the relevant components. There is no automatic fallback to live
infrastructure for unsupported activities. Adapter authors can use `Handle`,
`Handle1`, `Declare`, `Ready` and `OnPrepare` to add explicit contract simulations.

The library tests also execute the actual Docker entity init/finalize (including
interrupted creation) and Kubernetes apply/heal/finalize workflows with fake
external operations. These check lifecycle implementation separately from the
pipeline model; they are not a full installation test.
