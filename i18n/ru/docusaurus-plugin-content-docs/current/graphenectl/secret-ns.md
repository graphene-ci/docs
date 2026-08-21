---
sidebar_position: 11
title: "secret, ns"
sidebar_label: secret, ns
---

# secret, ns

## secret

```text
graphenectl secret set <name> [--value <v> | --value-file <path>]
graphenectl secret list
graphenectl secret delete <name>
```

Секреты живут шифрованными на сервере; **по проводам ходят только
имена** — в спеках, логах, истории и в выводе этой CLI. Значение
разрешает потребитель в момент использования.

| Флаг | Что делает |
|---|---|
| `--value` | значение строкой |
| `--value-file` | значение из файла — сырые байты, никогда не конвертируются |
| *(ни один)* | читать значение со stdin |

```console
$ graphenectl secret set gh-token --value-file token.txt
secret gh-token set
```

```console
$ pass show github | graphenectl secret set gh-token
secret gh-token set
```

```console
$ graphenectl secret list
gh-token
kubeconfig
```

```console
$ graphenectl secret delete gh-token
secret gh-token deleted
```

## ns

```text
graphenectl ns list
graphenectl ns create <name> [--retention-days <n>]
```

Неймспейс graphene — единица изоляции, симметричная неймспейсу
Temporal: записи, очереди, visibility, дерево владения — всё изолирует
сам durable-слой. Токены скоупятся одним неймспейсом; глаголы `ns`
требуют admin-токен.

| Флаг | Дефолт | Что делает |
|---|---|---|
| `--retention-days` | серверный дефолт (30) | retention закрытых workflow |

```console
$ graphenectl ns list
default
team-b
```

```console
$ graphenectl ns create team-b --retention-days 14
namespace team-b created
```
