---
sidebar_position: 3
title: Эксплуатация агентов
sidebar_label: Агенты
---

# Эксплуатация агентов

Агент подключает одну Linux-машину к одной инсталляции Graphene. Он не слушает
сетевой порт и постоянно восстанавливает исходящее соединение с сервером.

## Пути установки

- `pipeline.NewAgent(...).CloudInit()` возвращает user-data для машины, которую
  создаёт пайплайн.
- `pipeline.NewAgentViaSSH(...)` запускает тот же скрипт на существующей машине.
- При ручной установке бинарь можно запустить с окружением ниже, но публичной
  команды `graphenectl agent install` сервер пока не предоставляет.

Сгенерированный скрипт ставит `/usr/local/bin/graphene-agent`, пишет
конфигурацию mode 0600 в `/etc/graphene-agent/env`, пытается установить `runc`,
создаёт непривилегированного PTY-пользователя `graphene-run` и при наличии
systemd устанавливает service. С другим init system запускайте бинарь сами с
этим env-файлом.

## Окружение

| Переменная | Обязательность/default | Значение |
|---|---|---|
| `GRAPHENE_AGENT_SERVER` | обязательно | `host:port` сервера |
| `GRAPHENE_AGENT_TOKEN` | обязательно | credential этого агента |
| `GRAPHENE_AGENT_ID` | обязательно | id записи, которую представляет процесс |
| `GRAPHENE_AGENT_INSECURE` | false | отключить TLS; только development |
| `GRAPHENE_AGENT_CA_FILE` | пусто | дополнительный CA bundle сервера |
| `GRAPHENE_AGENT_DATA_DIR` | `/var/lib/graphene-agent` | images и runtime bundles |
| `GRAPHENE_AGENT_RUNTIME` | `runc` | `runc` или `exec` для разработки |
| `GRAPHENE_AGENT_REGISTRY` | пусто | адрес registry proxy сервера |
| `GRAPHENE_AGENT_PTY_USER` | пусто | пользователь interactive PTY; пусто означает root |

Одну машину нельзя молча перепривязать к другому id. Повтор с другим id
завершается `GRAPHENE_ALREADY_BOUND`; удаляйте старую identity только как явное
решение о переподготовке машины.

## Identity и lifecycle

Инсталляция может использовать настроенный `agentId:token@namespace` или
выпустить credential при наличии signing key. Сгенерированный token ограничен
одним агентом и имеет issuance TTL 30 дней. Это ещё не одноразовый bootstrap
exchange.

При начале session агент сообщает machine facts и SHA-256 бинаря. Если сервер
показывает другой digest, агент скачивает `/agent/binary`, проверяет digest,
заменяет себя и просит systemd перезапустить service. Затем соединение снова
сходится.

## Runtime и доверие

Для управления `runc` агент работает как root. Каждая пара machine/run получает
worker container с host в `/host`; `machine.Command` действует на файловой
системе хоста. Упаковка не является изоляцией. Interactive PTY должен работать
как `graphene-run`; пустой PTY user даёт root shell и пишет warning.

## Health и диагностика

```console
$ graphenectl get agent
$ graphenectl get agent/edge-1 -o json
$ graphenectl events agent/edge-1
$ graphenectl logs agent/edge-1 -f
$ graphenectl agent shell edge-1
```

На systemd-хосте:

```console
$ systemctl status graphene-agent
$ journalctl -u graphene-agent -f
$ runc list
```

Offline agent не уничтожает записи немедленно: reconnect и reboot машины
ожидаемы. Для безвозвратно потерянной машины пока нет поддерживаемой burial
команды; см. [Текущее состояние](../start/current-state.md).
