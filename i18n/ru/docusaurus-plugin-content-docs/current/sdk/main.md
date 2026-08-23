---
sidebar_position: 1
title: Main
sidebar_label: Main
---

# Main

Пайплайн — программа с одной точкой входа:

```go
func main() {
	pipeline.Main("perf-nightly", run,
		pipeline.WithTriggers(
			trigger.Cron("0 3 * * *", trigger.Params(map[string]any{...})),
			trigger.Webhook("push", trigger.HookSecret("gh-hook")),
		),
		pipeline.WithConcurrency(pipeline.Queue),
	)
}

func run(ctx pipeline.Context, params Params) (Result, error) { ... }
```

`Main` принимает идентификатор пайплайна, типизированную функцию и
опции уровня пайплайна. Роль (`run` / `machine`) и подключение
приходят из окружения — один бинарь обслуживает обе; см.
[Модель выполнения](../concepts/execution-model.md).

## Params и Result

Вход и выход рана — типы функции:

```go
// Из этого типа выводятся форма в UI и валидация сабмита.
type Params struct {
	// Event получает тело запроса webhook-триггера (зарезервированное имя).
	Event    json.RawMessage `json:"event,omitempty"`
	FolderId string          `json:"folderId"`
	Keep     time.Duration   `json:"keep"`
}

// Только маленькие значения — большие данные ходят артефактами.
type Result struct {
	Report string `json:"report"`
	VmId   string `json:"vmId"`
}
```

Контракт параметров проверяет компилятор, а не соглашение о строках.
`Result` — то, что CLI и браузер показывают для завершённого рана.

## Context

`ctx` несёт только то, чего не существует вне рана — идентификатор
рана и логгер. Всё, что действует, — свободные функции, принимающие
`ctx` первым аргументом: объявление ресурсов, действия, ссылки на
секреты.

## Триггеры

Раны стартуют не только руками: пайплайн объявляет триггеры —
cron-расписание или webhook. Параметры триггера — те же типизированные
`Params`; тело запроса webhook приходит в зарезервированное поле
`Event`, а `HookSecret` называет секрет, которым аутентифицируется
вызывающий.

## Concurrency

Политика concurrency управляет АВТОМАТИЧЕСКИМИ стартами:

| Политика | При срабатывании во время живого рана |
|---|---|
| `Queue` (по умолчанию) | отложить до завершения; максимум один отложенный — cron-семантика, без накопления |
| `CancelPrevious` | отменить живой ран, стартовать новый |
| `Parallel` | стартовать независимо |

Ручной старт при живом ране под `Queue` отклоняется с внятной ошибкой.
