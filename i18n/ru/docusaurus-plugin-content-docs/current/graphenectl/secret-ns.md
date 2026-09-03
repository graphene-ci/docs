---
sidebar_position: 11
title: "secret, var, namespace"
sidebar_label: secret, var, ns
---

# secret, var, namespace

Все три являются **записями**: объявляются, перечисляются, читаются и удаляются
общими глаголами. Специальной командой остаётся только канал, по которому
передаётся *значение* секрета.

## secret

Секрет состоит из двух слоёв. **Запись** (`kind: secret`) хранит жизненный цикл
имени, счётчик версий и историю ротаций; **значение** лежит запечатанным в value
store сервера и не читается обратно. Через specs, logs, history и CLI проходит
только имя.

```text
graphenectl secret set <name> [--value <v> | --value-file <path>]
```

| Флаг | Действие |
|---|---|
| `--value` | передать значение в аргументе |
| `--value-file` | прочитать raw bytes из файла |
| *(нет флага)* | прочитать значение из stdin |

```console
$ pass show github | graphenectl secret set gh-token
secret gh-token set (version 1)
```

Остальное выполняется общей грамматикой; удаление записи удаляет и значение:

```console
$ graphenectl get secret
$ graphenectl events secret gh-token
$ graphenectl delete secret gh-token --wait
```

## var

`var` — видимый сосед секрета: конфигурация окружения, которой не место в коде
пайплайна, но которая не является чувствительной. Значение хранится в записи и
читается обратно. Params ссылаются на него как `${var:name}`; door подставляет
значение перед валидацией запуска, а отсутствие variable останавливает submit.

```console
$ graphenectl apply var yc-zone --spec '{"value":"ru-central1-a"}'
$ graphenectl invoke var yc-zone set --data '{"value":"ru-central1-b"}'
$ graphenectl get var
$ graphenectl delete var yc-zone
```

## namespace

Namespace Graphene — единица изоляции, симметричная namespace Temporal:
записи, queues, visibility и дерево владения. Namespace-записи живут в
`graphene-system`, где также находятся роли, bindings и service accounts
инсталляции.

`graphene-system` защищён. `default` создаётся при первом запуске как обычный
проектный namespace и может быть удалён; restart не пересоздаёт уже известную
retired-запись.

```console
$ graphenectl apply namespace team-b --spec '{"retentionDays":14}'
$ graphenectl get namespace
REF                        PHASE  OWNER  LABELS
namespace/graphene-system  ready
namespace/default          ready
namespace/team-b           ready
$ graphenectl delete namespace team-b --wait
```

Удаление namespace выполняет **retire**: инсталляция перестаёт его обслуживать,
но содержимое не уничтожается сразу и стареет по retention. Ни новый вызов с
этим именем, ни restart сервера не воскрешают retired namespace.
