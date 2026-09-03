---
sidebar_position: 6
title: Триггеры
sidebar_label: Триггеры
---

# Триггеры

Триггеры объявляются в `pipeline.Main`. Публикация реконсилит их в записи,
принадлежащие пайплайну; удалённая декларация удаляет свою запись при следующей
публикации.

| Конструктор | Когда запускает | Важные опции |
|---|---|---|
| `trigger.Cron(spec)` | срабатывает пятичастное cron-расписание | `Name`, `Params` |
| `trigger.Webhook(name)` | сервер получает hook-запрос | `HookSecret`, `Params` |
| `trigger.Upstream(pipeline)` | завершился другой пайплайн | `OnOutcome`, `Name`, `Params` |

## Cron

```go
trigger.Cron("0 3 * * *",
    trigger.Name("nightly"),
    trigger.Params(Params{Mode: "full"}),
)
```

Имена внутри пайплайна уникальны. Имя cron по умолчанию — `cron`.

## Webhook

```go
trigger.Webhook("push",
    trigger.HookSecret("github-hook"),
    trigger.Params(Params{Mode: "changed"}),
)
```

Endpoint: `POST /hooks/{namespace}/{pipeline}/{name}`. Тело запроса приходит в
поле `json.RawMessage` с tag `json:"event,omitempty"`. `HookSecret` принимает
либо `Authorization: Bearer <value>`, либо
`X-Hub-Signature-256: sha256=<HMAC-SHA256(body)>`. Без `HookSecret` у hook нет
собственного shared secret; общая защита двери всё равно обязательна.

## Upstream

```go
trigger.Upstream("baseline", trigger.OnOutcome("success"))
```

Outcomes: `success`, `failure`, `any`; по умолчанию `success`. Event указывает
upstream pipeline, run и outcome. Durable payload передавайте через
[артефакт](artifacts-secrets.md), а не event.

## Params и concurrency

Params триггера должны точно соответствовать типу `Params` пайплайна. Бинарь
проверяет их до запуска worker, поэтому устаревшая декларация ломается при
публикации, а не во время будущего firing. `pipeline.Var` и
`pipeline.UseSecret` не дают значениям инсталляции попасть в исходники.

Пересечения автоматических запусков разрешает [concurrency policy](main.md#concurrency).
`Queue` хранит не больше одного pending firing и не является безразмерной
очередью задач.
