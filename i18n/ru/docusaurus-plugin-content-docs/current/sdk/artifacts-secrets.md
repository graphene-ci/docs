---
sidebar_position: 5
title: Артефакты и секреты
sidebar_label: Артефакты и секреты
---

# Артефакты и секреты

## Артефакты

Артефакт объявляется со своим **источником** — где лежат байты, часть
объявления; загрузка — дело обёртки (действие на нужной стороне под
капотом):

```go
reportArtifact := pipeline.NewArtifact(ctx, "perf-report",
	artifact.FromAgentFile(bareAgent, "/var/log/perf/report.tgz"),
)
```

`artifact.FromBytes` — для байтов, посчитанных самим раном. Запись
хранит digest; его считает сервер при загрузке — клиент не может
подделать.

Артефакт другого пайплайна присоединяется, не создаётся:

```go
baseline := pipeline.AttachArtifact(ctx, "baseline-report")
digest := baseline.Ready(ctx).Blob.Digest
```

## Секреты

`Secret` строит **ссылку** в набор секретов этого пайплайна —
значения назначаются пайплайну на сервере:

```go
k8sClient := k8slib.NewClientFromSecret(pipeline.Secret(ctx, "kubeconfig"),
	k8slib.WithScheme(ycapis.AddToScheme))
```

По проводу ходит только имя — в спеках, логах и истории. Значение
разрешается внутри действий в момент использования и обратно не
возвращается.
