---
sidebar_position: 4
title: Git actions
sidebar_label: Git
---

# Git actions

Git-библиотека запускает Git самой машины. Она намеренно оборачивает частые CI
операции, а не весь CLI. Каждый возвращённый call выполняется через
`activity.Activity` или `ActivityAll`.

## Установка и checkout

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

Каталог по умолчанию — `<machine.Workspace()>/src/<repo>`. Повтор того же
репозитория делает fetch и reset; другой каталог удаляется и клонируется.
`ExpectedCommit` превращает сдвинувшийся ref в non-retryable error.

## Read и write операции

| Call | Обязательные поля | Результат |
|---|---|---|
| `LsRemote` | `Repository`; опционально `Ref`, `Auth` | разрешённый commit |
| `Tag` | `Dir`, `Name`; опционально `Message`, `Push`, `Auth` | name и commit |
| `Commit` | `Dir`, `Message`, author name/email; опционально paths и push | commit и факт его создания |

Повторный tag того же commit и commit чистого дерева — успешные no-op. Tag,
указывающий на другой commit, — ошибка.

## Credentials

```go
gitlib.Auth{
    TokenSecret:  pipeline.Secret(ctx, "git-token"),
    TokenUser:    "oauth2",
    SSHKeySecret: pipeline.Secret(ctx, "git-key"),
}
```

HTTPS token становится временным `http.extraHeader`; SSH key пишется во
временный файл и удаляется после вызова. Credentials остаются ссылками,
разрешаются внутри action и не пишутся в `.git/config`. SSH сейчас использует
`StrictHostKeyChecking=accept-new`; если политика требует заранее закреплённый
host key, используйте HTTPS token.

Для необёрнутой операции создайте именованный action вокруг `machine.Command`.
Input должен быть сериализуем, а [гарантия выполнения](../sdk/activities.md#гарантии)
выбрана явно.
