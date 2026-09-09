---
sidebar_position: 9
title: Локальные тесты
sidebar_label: Локальные тесты
---

# Локальные тесты

`github.com/graphene-ci/pipeline/pkg/pipelinetest` подключает симулятор контрактов
Graphene к `go.temporal.io/sdk/testsuite.TestWorkflowEnvironment`. Исполняется
настоящая функция пайплайна: типизированные параметры, fixtures внешнего мира,
проверки результата и состояния ресурсов. Сервер Graphene, Docker, Kubernetes,
облачный аккаунт и shell машины не нужны.

## Установка

Добавьте SDK и нужные пайплайну адаптеры в его Go-модуль:

```bash
go get github.com/graphene-ci/pipeline@v0.2.0
go get github.com/graphene-ci/library/docker@v0.2.0
go get github.com/graphene-ci/library/k8s@v0.2.0
```

Адаптеры входят в модули своих библиотек и отдельно не версионируются.
Тесты работают с опубликованными зависимостями без локального workspace.

## Полный тест

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

Wrapper и cleanup-interceptor общие с `pipeline.Main`. Валидация параметров,
ошибки `Ready`, отмена и cleanup используют тот же код пайплайна. Каждый тест
создаёт своё окружение и мир; независимые миры поддерживают `t.Parallel()`.

## Activities и агенты

Сначала задайте fixtures и установите адаптеры, затем вызовите
`pipelinetest.Workflow`. Подготовка обнаруживает сигнатуры activities обычным
recording pass. После подготовки настройте моки и запустите workflow.

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

`OnAgentActivity` использует соглашение Temporal о параметрах мока: первый
аргумент — context activity. Один вызов на разных агентах можно подменять
независимо. Обычный `env.OnActivity` также работает для пользовательских
activities. Без подмены вызов завершается ошибкой `UnmockedActivity`; обнаруженное
production-тело не исполняется. Явная регистрация реализации на `env` разрешает
исполнение именно этой реализации.

`ConnectAfter` подключает только identity: запись по-прежнему должен объявить
пайплайн. `SeedAgent` задаёт существующую чужую запись для attach и selection.
`Disconnect`, `PublishCapability` и `FailResource` могут менять fixtures из
callbacks `env.RegisterDelayedCallback`. Labels и capability needs проверяются
по текущему состоянию мира; создающиеся агенты не попадают в выборку.

Ретраи пользовательских activities остаются ретраями Temporal. `AtMostOnce`
сохраняет одну попытку и классифицирует timeout как `pipeline.ErrUnknown`,
который может обработать пайплайн. `env.CancelWorkflow`, сигналы и delayed
callbacks работают как в обычном testsuite. Для своего payload converter
используйте `world.SetDataConverter`: он настроит и окружение, и результаты
моделируемых activities.

## Адаптеры Docker и Kubernetes

Установите адаптеры до подготовки пайплайна:

```go
dockertest.Install(world, "28.5.2")
objects := k8stest.Install(world)
```

Пути импортов — `github.com/graphene-ci/library/docker/dockertest` и
`github.com/graphene-ci/library/k8s/k8stest`.

Docker-адаптер моделирует контейнеры, volumes и networks, сохраняет нативные specs
и flows, возвращает детерминированные тестовые идентификаторы. Обработчик
`docker.install` публикует capability Docker. Подмените установку на одном агенте
через `OnAgentActivity`, чтобы проверить ошибку: неуспешный мок не публикует
capability.

Kubernetes-адаптер принимает нативные Go-объекты или maps. Ключ — точная ссылка
Graphene (`k8s.<group>.<version>.<Kind>/<id>`; для namespace id имеет вид
`<namespace>.<name>`). Задавайте наблюдаемые поля через `objects.Set(ref, live)`
или `objects.After(delay, ref, live)` и проверяйте возвращаемую ошибку.
Пропущенные поля берутся из объявленного manifest. Адаптер исполняет настоящий
predicate `WithReady` с интервалом polling и timeout этого kind. Отсутствующий
или неготовый fixture не становится ready автоматически. Разрешение ссылок
Crossplane и выданные провайдером идентификаторы задаются fixtures.

## Проверки и время жизни

| Поверхность | Что проверяет или возвращает |
|---|---|
| `Resource(ref)` | Копию записи: owner, phase, spec, state, agent и flows |
| `Calls()` | Имена activities, очереди, сериализованные аргументы и виртуальное время |
| `Events()` | Порядок declare, ready, transfer и delete |
| `Outcome("run/test-<pipeline>")` | Итог cleanup: success, failure или canceled |
| `AssertOwner(t, ref, owner)` | Ресурс жив и принадлежит ожидаемому владельцу |
| `AssertNoLeaks(t)` | Нет сирот, циклов и оставшихся ресурсов завершённого прогона |
| `Advance(duration)` | Продвижение TTL модели после завершения корневого workflow |

`ToStand` переносит корень объявленного дерева зависимостей, как серверный
transfer на stand. Точечный transfer через `Children` меняет владельца только
этого ребёнка. Cleanup удаляет оставшееся во владении прогона. Явно переданные
ресурсы сохраняются, даже если последующий код пайплайна завершился ошибкой.
Чужие fixtures не усыновляются и не удаляются cleanup. Удалённые записи остаются
доступны для проверок. Содержимое blob удаляется, когда на него больше не
ссылается ни один живой артефакт мира.

`Advance` накопительный и доступен только после завершения workflow. Он двигает
модель, а не настоящий stand workflow. Внутри workflow используйте таймеры и
callbacks Temporal. `Calls` записывает dispatch, а не каждую попытку ретрая;
проверять попытки нужно через mock expectations или activity listeners Temporal.

## Полный пример и локальные checkout

`examples/full/main_test.go` проверяет настоящую функцию `run`: два агента,
типизированные status Crossplane, Docker, артефакты, flows и передачу на stand.
Сценарии: успех, ошибка работы, отмена при ожидании VM, ошибка создания VM,
неудачная установка Docker и отсутствие чужого артефакта. Последний сценарий сохраняет ресурсы, переданные на stand до ошибки.

Проверка выпущенного примера с зафиксированными зависимостями:

```bash
git clone --branch full/v0.1.0 https://github.com/graphene-ci/examples.git
cd examples/full
GOWORK=off go test -race ./...
GOWORK=off go run . plan
```

Для совместной разработки ещё не опубликованных SDK и библиотек клонируйте
`pipeline`, `library` и `examples` в соседние каталоги:

```bash
cd examples
make configure
make test
make lint
cd full
go run . plan
go test -race ./...
```

`configure` создаёт игнорируемый Git файл `go.work` со ссылками на эти checkout
и ставит инструменты прибитых версий в `bin/` репозитория. Версии в `go.mod`
остаются неизменными. В репозитории библиотек есть
аналогичные `configure`, `test` и `lint` для всех модулей.

## Граница проверки

Симулятор исполняет код пайплайна и моделирует сервисные контракты. Он не
запускает control plane Graphene, процессы агентов, контроллеры Kubernetes,
контейнеры Docker, stand workflows или сервис Temporal. Сервисные activities
моделируются workflow-корутинами и виртуальными таймерами; транспортные ретраи
и heartbeats этих activities не воспроизводятся. Пользовательские activities
используют обычное исполнение и моки Temporal testsuite.

Сетевые flows — декларации, а не проверка связности. Доставка телеметрии,
разрешение секретов, допуск cron/webhook, managed-запуски других пайплайнов,
`ContinueAsNew`, согласованность visibility и восстановление после падения
воркера требуют отдельных тестов соответствующих компонентов. Для
неподдерживаемых activities нет автоматического перехода к живой инфраструктуре.
Авторы адаптеров могут использовать `Handle`, `Handle1`, `Declare`, `Ready`
и `OnPrepare` для явного моделирования дополнительных контрактов.

Тесты библиотек также исполняют настоящие Docker entity init/finalize, включая
прерванное создание, и Kubernetes apply/heal/finalize с подменой внешних
операций. Они проверяют реализацию lifecycle отдельно от модели пайплайна;
это не тест полной инсталляции.
