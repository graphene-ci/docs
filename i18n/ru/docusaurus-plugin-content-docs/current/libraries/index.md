---
sidebar_position: 1
title: Библиотеки ресурсов
sidebar_label: Обзор
---

# Библиотеки ресурсов

Библиотеки превращают внешнюю систему в два примитива Graphene:

- **resource** — durable запись с владельцем, convergence и finalize;
- **action** — именованная одноразовая работа на агенте.

| Библиотека | Ресурсы | Actions |
|---|---|---|
| [Docker](docker.md) | container, network, volume | установка engine, сборка image |
| [Kubernetes](kubernetes.md) | любой типизированный Kubernetes object | apply/reconcile/delete внутри ресурса |
| [File](file.md) | файл на машине | write/remove внутри ресурса |
| [Git](git.md) | — | install, checkout, ls-remote, tag, commit |

Все конструкторы ресурсов возвращают `pipeline.Resource[T]` и принимают общие
опции владения, меток и flows. Все конструкторы actions возвращают
`activity.Call[T]` и выполняются через `activity.Activity` или `ActivityAll`.
Начните со [справочника core](../sdk/reference.md).

Каталог открыт: бинарь пайплайна может принести другой kind и опубликовать его
схему в manifest. Точный каталог подключённой инсталляции показывает
`graphenectl kinds`.
