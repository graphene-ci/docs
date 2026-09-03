---
slug: /
sidebar_position: 1
title: Graphene
sidebar_label: Graphene
hide_title: true
---

<div className="graphene-hero">
  <img src="/docs/img/logo-full.svg" alt="" className="graphene-hero__mark graphene-hero__mark--dark" />
  <img src="/docs/img/logo-full-light.svg" alt="" className="graphene-hero__mark graphene-hero__mark--light" />
  <div className="graphene-hero__tagline">
    Control plane для CI и инфраструктуры:<br/>
    процесс и ресурс в одной модели.
  </div>
</div>

Graphene нужен для автоматизации, где вместе управляются **работа** и
**инфраструктура, на которой она выполняется**. Pipeline — типизированная
Go-программа. Машины, контейнеры, Kubernetes-объекты, файлы и artifacts —
durable-ресурсы с состоянием, owner и временем жизни.

Общая модель закрывает разрыв между CI, который обычно видит только steps, и
IaC, который обычно видит только desired state.

## Что меняется на практике

| Задача | Модель Graphene |
|---|---|
| Создать среду для одного тестового run | Run владеет деревом ресурсов; терминальное завершение финализирует его |
| Сохранить упавшую среду для разбора | Передать её поддерево pipeline stand, при необходимости с TTL |
| Работать на удалённой или существующей машине | Её agent подключается наружу; actions не требуют входного управляющего порта |
| Передать данные между pipelines | Опубликовать и присоединить durable artifact record |
| Восстановиться после падения worker | Продолжить исполнение по записанным ресурсам, не пересоздавая их вслепую |
| Объяснить сбой | Читать state, events, logs, metrics и traces одной записи |

Resource libraries добавляют типизированные реализации, не меняя эту модель.
Сейчас есть библиотеки для [Docker](libraries/docker.md),
[Kubernetes и Crossplane](libraries/kubernetes.md), [Git](libraries/git.md) и
[файлов](libraries/file.md).

## Выберите путь

| Если нужно… | Начните здесь |
|---|---|
| Понять продукт и его текущую границу | [Текущее состояние](start/current-state.md) → [Какие задачи можно решать](start/use-cases.md) |
| Попробовать без запуска сервера | [Первый локальный план](start/first-look.md) |
| Пройти полный локальный сценарий | [Первый запуск в dev-инсталляции](start/end-to-end.md) |
| Написать pipeline | [Команды pipeline binary](sdk/commands.md) → [Main](sdk/main.md) → [Справочник SDK](sdk/reference.md) |
| Работать из командной строки | [`graphenectl`](graphenectl/index.md) |
| Работать визуально | [Graphene Studio](studio/index.md) |
| Подключить другой клиент | [Management API](api/index.md) |
| Настроить или диагностировать инсталляцию | [Эксплуатация](operations/development-installation.md) |

## Текущая граница

В репозитории есть полная dev-инсталляция, но нет hardened production
distribution. Go — единственный встроенный API авторинга pipeline. Pkl/KCL и
language-neutral YAML-формат pipeline не входят в текущий продукт. Точный
список готовых и незавершённых возможностей поддерживается в разделе
[Текущее состояние](start/current-state.md).
