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

Внешний установщик ограничен тремя минутами, включая дочерние загрузки;
при ошибке или таймауте используется пакет дистрибутива.
APT ждёт освобождения блокировки другим установщиком до 120 секунд, в том
числе при автоматических обновлениях свежей машины. Таймаут передаётся через
временный конфиг одного вызова и действует для внешнего установщика и fallback.
Существующие настройки APT сохраняются; временный файл удаляется при выходе.
Работающие менеджеры пакетов и их lock-файлы остаются нетронутыми.

`Install` отправляет heartbeat сразу и затем каждые 15 секунд во время
установки engine и публикации capability. Таймаут heartbeat должен быть больше
этого интервала (например, одна минута), а общий таймаут установки — длиннее.
При потере отчёта о завершении activity может повториться после таймаута
heartbeat; уже установленный engine используется повторно.

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

### Телеметрия изнутри контейнера

Контейнер и job получают в окружение `OTEL_EXPORTER_OTLP_ENDPOINT` (и
`OTEL_EXPORTER_OTLP_INSECURE=true`), если спека не задаёт endpoint сама. Он
указывает на локальный OTLP-приёмник исполнителя — на docker bridge, а для
контейнера в host network на loopback; приёмник ставит на всё пришедшее штамп
рана и пересылает в Graphene. Инструмент, говорящий на OpenTelemetry (тестовый
набор, stroppy), пишет в логи, метрики и трейсы рана без настройки; адрес
сервера и токен в контейнер не попадают. См.
[наблюдаемость](../concepts/observability.md).

## Job

Job выполняет контейнер **до завершения** — одноразовая пара к `Container`. Это
действие, а не ресурс: ничем не владеет, на машине после него остаётся только
файл лога.

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

Спека — та же пара типов Docker, что у `Container`; своего словаря job не
добавляет. Файлы попадают в контейнер по-докеровски — bind mount каталога на
машине. Положить их туда — [файловым ресурсом](./file.md) (`file.FromEmbed`
везёт скрипт внутри бинаря пайплайна), а прочитать то, что job записал в mount, —
через `artifact.FromAgentFile`.

| Поле отчёта | Смысл |
|---|---|
| `ExitCode` | код выхода контейнера |
| `Stdout` | только stdout, первые 256 КиБ — для машиночитаемого ответа |
| `Tail` | конец слитого stdout+stderr, последние 16 КиБ — сводка или ошибка |
| `LogPath` | полный слитый вывод на машине — отдать артефакту |

Ненулевой код выхода — **исход**, а не провал activity: job отработал, что
значит его статус — решает пайплайн. Activity падает только тогда, когда
контейнер вообще не удалось запустить; если нет образа, ошибка несёт причину
неудавшегося pull.

Каждая строка вывода — ещё и лог-запись рана (`graphenectl logs run <id>`) с
именем job и потоком `stream`, из которого она пришла. Stdout и stderr собирают
строки раздельно, поэтому недописанная строка одного потока не вклеивается в
другой; файл лога и `Tail` остаются слитым выводом в том виде, в каком его отдал
Docker. Поток — **не** уровень важности: множество инструментов пишут обычный
прогресс в stderr, а pytest печатает провалы в stdout, — поэтому все строки
записываются одним уровнем. Важность несёт собственное слово job: ненулевой код
выхода добавляет одну запись-**предупреждение**
`job <name> exited with status <n>`.

Job заменяет оставшийся контейнер с тем же именем и удаляет свой контейнер на
любом пути выхода, включая отмену; `AutoRemove` сбрасывается, чтобы код выхода
не терялся из-за удаления самим Docker. Допустимо ли повторное выполнение —
знание вызывающего: job, который грузит данные или шлёт сообщение, хочет
`AtMostOnce`.

В [локальных тестах](../sdk/testing.md) у job нет исхода по умолчанию — то, что
печатает контейнер, и есть данные теста:

```go
dockertest.OnJob(world, "runner-1", "infra-tests").
    Return(dockerlib.JobReport{Stdout: "{\"ok\":true}\n"}, nil).Once()
```

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
