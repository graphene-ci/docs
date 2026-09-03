---
sidebar_position: 4
title: Первый development-ран
sidebar_label: Первый development-ран
---

# Первый development-ран

Этот сценарий запускает минимальный пример на development-стеке и существующей
Linux-машине, доступной по SSH. На машине нужны `curl`, поддерживаемый service
manager и SSH-учётка, которой разрешено установить агент. Host key обязателен:
Graphene не использует trust-on-first-use.

## 1. Запустите control plane

Выполните [Development-инсталляцию](../operations/development-installation.md),
затем проверьте контекст:

```console
$ graphenectl whoami
$ graphenectl get namespace
```

Если целевая машина удалённая, до запуска Compose задайте доступный ей адрес в
`GRAPHENE_SERVER_EXTERNAL`. Агент открывает исходящее соединение; входящий порт
агента не нужен.

## 2. Сохраните SSH-ключ

Пример принимает имя секрета, а не байты приватного ключа:

```console
$ graphenectl secret set bare-ssh-key --value-file ~/.ssh/id_ed25519
$ graphenectl get secret bare-ssh-key
```

Значение нельзя прочитать обратно. Ротация добавляет событие той же записи
секрета.

## 3. Проверьте и опубликуйте пайплайн

```console
$ git clone https://github.com/graphene-ci/examples.git
$ cd examples/minimal
$ go run . plan
$ go run . push
```

`push` кросс-компилирует этот `main`, без локального Docker-демона собирает
worker image, отправляет его через дверь сервера и публикует типизированный
манифест. Повтор без изменения кода переиспользует content-addressed image.

Проверьте опубликованное:

```console
$ graphenectl get pipeline baseline
$ graphenectl tree pipeline/baseline
```

## 4. Запустите и наблюдайте

Development-стек содержит identity агента `vm-1`. Используйте это имя записи и
точный публичный host key SSH-машины:

```console
$ go run . run \
    --host 192.0.2.40:22 \
    --user root \
    --hostKey 'ssh-ed25519 AAAA...' \
    --agent vm-1 \
    --key bare-ssh-key \
    --work 'uname -a' \
    --keep 10m \
    --watch
```

Бинарь делает push только при изменении, по SSH устанавливает исходящий агент,
выполняет `work` на машине, публикует `artifact/baseline-report` и печатает
типизированный результат. При неуспешном ране `--watch` завершится ненулевым
кодом.

В другом терминале:

```console
$ graphenectl get run -w
$ graphenectl run status <run-id>
$ graphenectl tree run/<run-id>
```

`run status` отвечает, какая activity выполняется и почему повторяется; `run
watch` показывает меняющиеся дерево, события и хвост логов.

## 5. Проверьте результат и удалите

```console
$ graphenectl get artifact baseline-report
$ graphenectl tree pipeline/baseline
$ graphenectl delete pipeline baseline --wait
```

Удаление идёт по владению: дети финализируются раньше владельца, а записи
удаляют принадлежащие им байты. `Keep` в примере задерживает завершение; если
ждать не нужно, отмените ран командой `graphenectl run cancel <run-id>`.

## Альтернатива: Git-источник и ревизия

Production-shaped путь исходников выполняется сервером и неизменяем:

1. `apply gitsource` с repository, ref, subdirectory и runtime;
2. `revision materialize` для сборки ревизии;
3. `revision run` для проверки draft;
4. `invoke pipeline ... activate` для выбора текущей версии.

Точные команды находятся в [Пайплайнах, исходниках и ревизиях](../graphenectl/pipeline.md).
Оба пути публикации создают один контракт пайплайна: direct `push` удобен в
локальной разработке, Git materialization — для контролируемого источника.

Далее: [напишите пайплайн](../sdk/main.md), разберите
[владение ресурсами](../concepts/resources.md) или откройте
[Studio](../studio/index.md).
