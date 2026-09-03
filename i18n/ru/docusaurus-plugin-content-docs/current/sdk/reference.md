---
sidebar_position: 8
title: Справочник core SDK
sidebar_label: Справочник core
---

# Справочник core SDK

Это публичная поверхность автора. Конструкторы для авторов библиотек
(`NewResource`, `NewAttached`, `FailedResource`, recording hooks и raw worker
API) намеренно не входят в обычный workflow пайплайна.

## Pipeline

| Символ | Контракт |
|---|---|
| `Main(id, fn, ...MainOption)` | обслуживать один типизированный пайплайн |
| `WithTriggers(...trigger.T)` | объявить автоматические точки входа |
| `WithConcurrency(policy)` | выбрать `Queue`, `CancelPrevious` или `Parallel` |
| `Context.RunId()` | identity текущего рана |
| `Context.Logger()` | replay-safe Temporal logger |
| `Var(name)` | ссылка на видимое значение инсталляции в trigger params |
| `UseSecret(name)` | ссылка на имя секрета в trigger params |
| `Secret(ctx, name)` | ссылка на секрет внутри рана |

## Handles и владение

| Символ | Контракт |
|---|---|
| `Resource[T].Ready(ctx)` | дождаться и вернуть `T`; ошибка convergence провалит ран |
| `Resource[T].TryReady(ctx)` | дождаться и вернуть `(T, error)` |
| `Attached[T]` | читаемый чужой handle без методов владения |
| `Parent(h)` | сделать `h` владельцем декларации |
| `Children(h...)` | отдать существующие свои handles новой декларации |
| `WithLabels(map)` | записать метки выборки |
| `WithFlow` / `WithFlowTo` | аннотировать исходящее ребро топологии |
| `FlowPort(n)` | задать целевой порт ребра |
| `ToStand(ctx, h, ...TransferOption)` | передать своё поддерево stand пайплайна |
| `KeepFor(duration)` | TTL под stand; без него нужно явное удаление |

Протоколы flow: `TCP`, `HTTP`, `GRPC`, `PrometheusPull`, `RemoteWrite`, `OTLP`.
Flow описывает топологию, но не настраивает сеть.

## Агенты

| Символ | Контракт |
|---|---|
| `NewAgent` | объявить запись и получить cloud-init установки |
| `NewAgentViaSSH` | объявить и установить на существующую SSH-машину |
| `AttachAgent` | использовать существующий агент без владения |
| `SelectAgents` | snapshot по меткам и требованиям capability |
| `Need` | потребовать готовую capability |
| `WhereLabel`, `WhereIn` | ограничить метки capability |
| `PublishCapability` | записать, что workflow сделал истинным на машине |

`AttachAgent` принимает требования capability, но не владение в дереве.
Выборка тоже чужая и не захватывает будущие подходящие агенты.

## Actions и artifacts

| Символ | Контракт |
|---|---|
| `activity.Fn`, `ActivityFn`, `Fn0` | связать стабильное имя, body и сериализуемый input |
| `activity.Activity` | выполнить на одном агенте |
| `activity.ActivityAll` | выполнить параллельно на snapshot |
| `WithGuarantee` | `AtLeastOnce` или `AtMostOnce` |
| `WithTimeout`, `WithHeartbeat` | ограничить выполнение и обнаружить потерю |
| `NewArtifact` | опубликовать `FromBytes` или `FromAgentFile` |
| `AttachArtifact` | прочитать чужую запись артефакта |

At-most-once timeout присоединяет `pipeline.ErrUnknown`: система не может
доказать внешний эффект и не повторит его молча.

Конструкторы с теми же handles находятся в [библиотеках ресурсов](../libraries/index.md).
