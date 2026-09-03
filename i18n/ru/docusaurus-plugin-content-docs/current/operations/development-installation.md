---
sidebar_position: 1
title: Development-инсталляция
sidebar_label: Development-инсталляция
---

# Development-инсталляция

Репозиторий `graphene` содержит полный локальный контур для разработки и
оценки продукта. Это кратчайший путь от локального плана к работающему control
plane, но не production-дистрибутив.

## Что запускается

`make compose-up` собирает сервер и запускает:

- development-сервер Temporal;
- MinIO для blobs и хранилища registry;
- container registry;
- VictoriaMetrics, VictoriaLogs и VictoriaTraces;
- сервер Graphene.

Сервер открывает одну дверь на `:7233`. Через один listener маршрутизируются
Management и worker API, сессии агентов, прокси к Temporal, приём OTLP, health
probes и прокси registry. Только UI телеметрии публикуются на отдельных портах.

## Запуск и вход

Нужны Docker с Compose, Make, Git и Go:

```console
$ git clone https://github.com/graphene-ci/graphene.git
$ cd graphene
$ make configure
$ export GRAPHENE_SECRETS_KEY="$(openssl rand -hex 32)"
$ make compose-up
$ go build -o bin/graphenectl ./cmd/graphenectl
$ printf '%s\n' dev-admin-token | \
    bin/graphenectl login --server 127.0.0.1:7233 --token-stdin --insecure
$ bin/graphenectl get namespace
```

При повторном использовании volume `graphene-data` сохраняйте тот же
`GRAPHENE_SECRETS_KEY`. Сервер откажется открывать хранилище секретов,
запечатанное другим ключом.

`make compose-down` останавливает контур и сохраняет именованные volumes. Для
намеренно чистой инсталляции используйте обычное управление volumes в Docker
Compose.

## Удалённые агенты и workers

Внешний адрес по умолчанию — `127.0.0.1:7233`; он подходит только для
локальной машины. Перед подключением другой машины опубликуйте достижимый адрес:

```console
$ export GRAPHENE_SERVER_EXTERNAL=192.0.2.10:7233
$ make compose-up
```

Этот адрес должен быть доступен и удалённому агенту, и запущенному им
worker-контейнеру. Агенты Graphene подключаются наружу; входящий порт на машине
агента не нужен.

## Безопасность и граница production

Контур намеренно предназначен только для разработки:

- транспорт остаётся открытым, если перед сервером не поставлен TLS-прокси с
  поддержкой HTTP/2;
- admin, run, agent, MinIO и registry используют development-реквизиты;
- сервер монтирует Docker socket хоста для запуска managed run workers;
- образы зависимостей сейчас используют плавающие теги;
- Temporal, storage и telemetry работают как single-node dev-сервисы.

Перед публикацией двери в сеть замените все реквизиты и задайте стабильный
внешний адрес. Репозиторий пока не поставляет production deployment. Для него
ещё нужно явно определить топологию, закрепить образы, настроить TLS, внешние
долговечные хранилища, backup/restore и управление ключами.

