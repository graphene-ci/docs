---
sidebar_position: 3
title: Действия
sidebar_label: Действия
---

# Действия

Действие — функция, адресованная агенту и выполняемая на его машине.
Глагол — это **Call**: именованное тело со связанным аргументом; одно
и то же значение служит и одному агенту, и набору.

## Объявление по месту

Имя и тело живут там, где нужны; аргументы ходят только через
связывание — явно и сериализуемо:

```go
report, err := pipelineactivity.Activity(ctx, bareAgent,
	pipelineactivity.ActivityFn(
		"run-work",
		func(ctx context.Context, work string) (string, error) {
			out, err := machine.Command(ctx, "/bin/sh", "-c", work).CombinedOutput()
			return string(out), err
		},
		params.Work,
	),
)
```

Тело выполняется в контейнере на машине; `machine.Command` делает
chroot в файловую систему хоста — сам образ исполнителя не имеет
shell. Объявляйте действия безусловно (не за ветками по рантайм-
значениям): записывающий проход идёт по пути нулевых значений.

## Веер

«Выполнить на всех, кто помечен»: выбрать агентов по меткам, затем
один вызов на каждом агенте параллельно. Результаты выровнены с
целями; ошибки объединяются в одну с именем каждого агента:

```go
edges, err := pipeline.SelectAgents(ctx,
	pipeline.WithLabels(map[string]string{"role": "edge"}))
...
installReports, err := pipelineactivity.ActivityAll(ctx, edges, dockerlib.Install())
```

Библиотечный глагол — то же значение `Call`: `dockerlib.Install()`
работает и в `Activity`, и в `ActivityAll`.

## Гарантии

У каждого действия — гарантия исполнения:

- **At-least-once** (по умолчанию): сходящаяся работа, ретраится —
  тело пишется идемпотентным.
- **At-most-once**: одноразовая работа, не ретраится никогда;
  неопределимый исход всплывает ошибкой `ErrUnknown` — никогда
  повторным выполнением.

```go
pipelineactivity.Activity(ctx, agent, call,
	pipelineactivity.WithGuarantee(pipelineactivity.AtMostOnce),
	pipelineactivity.WithTimeout(5*time.Minute),   // граница одного выполнения (по умолчанию 10m)
	pipelineactivity.WithHeartbeat(30*time.Second), // «ещё работает» vs «умер»
)
```
