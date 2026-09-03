---
sidebar_position: 7
title: Data flows и топология
sidebar_label: Data flows
---

# Data flows и топология

Ownership отвечает на вопрос **кто несёт ответственность за ресурс и его
смерть**. Flow независимо отвечает **кто с кем и как взаимодействует**.
Зависимость сервисов не должна притворяться владением только ради рисунка.

Ресурс объявляет своё исходящее ребро:

```go
pgExporter := dockerlib.Container(ctx, agent, exporterSpec,
    pipeline.WithFlowTo(pg, pipeline.TCP, "postgres", pipeline.FlowPort(5432)),
)
```

`WithFlowTo` указывает на handle другого ресурса. `WithFlow` может указывать на
внешнюю endpoint-строку. Известные протоколы: `TCP`, `HTTP`, `GRPC`,
`PrometheusPull`, `RemoteWrite`, `OTLP`; значение открыто, поэтому библиотека
может назвать более специальный protocol. Port остаётся структурированным
полем, label — человеческим описанием.

Flows описывают **заявленное намерение**, а не проверенный сетевой traffic. Они
живут в state записи, сохраняются после передачи ресурса стенду и позволяют
Studio рисовать текущую топологию. Системные virtual edges также показывают,
как агент переносит commands, TTY sessions и telemetry через сервер.

Resource flows не следует смешивать с межпайплайновыми control и data
contracts: upstream trigger запускает другой пайплайн, artifact переносит
durable bytes. Они могут быть видны рядом с топологией, но имеют собственную
lifecycle-семантику.
