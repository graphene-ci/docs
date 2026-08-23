---
sidebar_position: 5
title: Namespaces
sidebar_label: Namespaces
---

# Namespaces

## Единица изоляции

**Namespace** изолирует всё: записи, раны и секреты разных namespace
не видят друг друга. Каждый namespace graphene зеркалится в
одноимённый namespace Temporal — изоляция держится на уровне
durable-ядра, а не фильтров в коде сервера.

## Токены несут scope

**Токен** — единственный вид credentials. Три роли — `admin`, `run`,
`agent` — и каждый токен привязан к namespace; админский может быть
привязан ко всем:

```mermaid
flowchart TD
    subgraph NS1["namespace: team-a"]
      R1["записи"]
      RUN1["раны"]
      S1["секреты"]
    end
    subgraph NS2["namespace: team-b"]
      R2["записи"]
      RUN2["раны"]
      S2["секреты"]
    end
    T1["токен рана @team-a"] --> NS1
    T2["токен агента @team-b<br/>+ привязан к одному агенту"] --> NS2
    TA["админский токен @*"] --> NS1
    TA --> NS2
    T1 -.->|"пути нет"| NS2
```

Токен агента дополнительно привязан к одному агенту: он может
воплощать эту запись и никакую другую.
