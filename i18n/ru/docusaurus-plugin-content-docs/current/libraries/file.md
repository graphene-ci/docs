---
sidebar_position: 3
title: File
sidebar_label: File
---

# File

Ресурс file записывает байты на машину агента во время initialize и удаляет
файл при finalize. Это обратная сторона artifact, который читает байты с машины
в blob store.

```go
cfg := filelib.File(ctx, agent, "/etc/myapp/config.json",
    file.FromBytes(raw),
    pipeline.WithLabels(map[string]string{"app": "myapp"}),
)
path := cfg.Ready(ctx).Path
```

Нужен ровно один source:

| Source | Где разрешается |
|---|---|
| `file.FromBytes(b)` | inline-байты рана; только небольшой контент |
| `file.FromEmbed(fs, path)` | байты, включённые в бинарь через `go:embed` |
| `file.FromSecret(name)` | значение секрета на целевой машине |
| `file.FromArtifact(name)` | blob существующей записи artifact |

Байты секрета не попадают в spec ресурса и workflow history. Байты artifact
стримятся из blob store сервера. Режим файла по умолчанию `0644`; текущий
публичный конструктор не открывает option режима.

Собственный агент автоматически владеет файлами. Файл на attached agent
принадлежит рану и тоже удаляется при его завершении, если не передан дальше.
Родительские каталоги создаются как `0755`; finalize удаляет файл, но не пустые
родительские каталоги.
