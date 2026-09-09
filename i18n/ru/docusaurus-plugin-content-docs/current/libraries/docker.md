---
sidebar_position: 2
title: Docker
sidebar_label: Docker
---

# Docker

Работа Docker выполняется на машине агента. `Install` и `Build` — actions;
containers, networks и volumes — записи ресурсов с владельцами.

## Установка и сборка

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

`Install` использует существующий engine или ставит его package manager'ом
машины, затем публикует capability `docker`. `Build` использует Buildx/BuildKit
машины и возвращает digest и tags. Пути должны быть действительны на машине;
`machine.Workspace()` — общий same-path каталог.

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

`Config` и `Host` — нативные Go-типы Docker. Декларация идемпотентна по имени:
отсутствующий контейнер создаётся и запускается, остановленный — запускается.
`Scrape` просит агент читать Prometheus endpoint и атрибутировать samples записи
контейнера.

## Network и volume

```go
net := dockerlib.Network(ctx, agent, dockerlib.NetworkSpec{
    Name: "private",
    Options: network.CreateOptions{Driver: "bridge"},
})

data := dockerlib.Volume(ctx, agent, volume.CreateOptions{Name: "db-data"})
```

Оба используют нативные option structs Docker и сходятся по имени. Finalize
удаляет Docker object; данные volume поэтому умирают вместе с владельцем. Чтобы
ресурс пережил ран, передайте его [stand](../concepts/resources.md#пережить-свой-ран).

Если агент принадлежит рану, Docker-ресурсы становятся его детьми. На attached
agent они остаются детьми рана: чужая запись не может отвечать за ваши
декларации.

## Локальные тесты

Моделирование зависимостей и проверка пайплайна описаны в
[руководстве по локальным тестам](../sdk/testing.md).
