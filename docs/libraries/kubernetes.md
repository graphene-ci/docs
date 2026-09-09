---
sidebar_position: 5
title: Kubernetes and Crossplane
sidebar_label: Kubernetes
---

# Kubernetes and Crossplane

The Kubernetes library turns any registered Go API type into a Graphene
resource: initialize applies and waits, reconcile heals drift, finalize deletes.
Crossplane resources use the same mechanism; the provider and credentials
belong to the user's cluster.

## Client and types

```go
client := k8slib.NewClientFromSecret(
    pipeline.Secret(ctx, "kubeconfig"),
    k8slib.WithScheme(providerapis.AddToScheme),
)
```

The kubeconfig resolves from the secret only inside the run worker. Built-in
Kubernetes types are registered by default; `WithScheme` adds CRDs from their
native Go packages.

## Declare a resource

```go
network := k8slib.Resource(ctx, client, "net", &vpc.Network{
    Spec: vpc.NetworkSpec{ForProvider: vpc.NetworkParameters{
        FolderID: &params.FolderId,
    }},
},
    k8slib.WithReady(func(live *vpc.Network) bool {
        return live.Status.GetCondition(xpv1.TypeReady).Status == corev1.ConditionTrue
    }),
    k8slib.WithTimeout[vpc.Network](30*time.Minute),
    k8slib.WithResourceOption[vpc.Network](pipeline.WithLabels(labels)),
)
```

The `name` argument becomes both record id and `metadata.name`; a conflicting
name on the object is rejected. `Ready` returns the live typed object, including
status written by the cluster or provider.

## Options

| Option | Default | Contract |
|---|---|---|
| `WithReady(fn)` | kstatus/Ready-condition convention | decide readiness from the live object |
| `WithDrifted(fn)` | only disappearance is drift | decide whether to reapply desired state |
| `WithValidate(fn)` | none | reject desired state before activity execution |
| `WithReconcileEvery(d)` | 30s | drift-check period |
| `WithPollInterval(d)` | 5s | readiness polling period |
| `WithTimeout(d)` | 20m | maximum convergence wait |
| `WithResourceOption(...)` | run ownership | parent, children, labels and flows |

The first declaration of a Go kind fixes its handlers for that worker. Keep the
same options for subsequent instances.

Crossplane managed resources often have no conditions immediately after apply;
provide `WithReady` for the provider's real readiness signal. Prefer native
reference fields between Kubernetes objects: the cluster resolves them without
moving generated ids through workflow history.

The current project has unit coverage for the library but no shipped live-kind
cluster conformance suite. Treat provider behavior as part of your pipeline's
tested contract.

## Local tests

See [Local tests](../sdk/testing.md) for fixtures, dependency adapters and pipeline assertions.
