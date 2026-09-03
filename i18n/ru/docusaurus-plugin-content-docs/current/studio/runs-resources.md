---
sidebar_position: 4
title: Runs и ресурсы
sidebar_label: Runs и ресурсы
---

# Runs и ресурсы

Studio показывает ту же универсальную модель records, что и `graphenectl`:
run владеет деревом ресурсов, у каждого record есть состояние и история, а
доступные операции задают его kind и permissions caller.

## Запустить и проследить run

Откройте pipeline, выберите активную revision и заполните сгенерированную
типизированную форму. Studio получает её из schema revision и не хранит свою
копию параметров pipeline. Отправьте run, затем используйте:

- **trace** для прогресса исполнения и зависимостей;
- **owned tree** для всего, что создано под run;
- **rerun**, чтобы снова отправить те же inputs pipeline;
- **cancel**, чтобы запросить отмену активного run.

Cancellation асинхронна. Следите за run до терминального outcome: worker ещё
должен финализировать принадлежащее run дерево ресурсов.

## Исследовать record

Выбор run, resource, agent, artifact или системного record открывает общий
inspector. В зависимости от kind и permissions в нём доступны:

| Представление | Назначение |
|---|---|
| State | Текущие spec, outputs, phase, owner и labels |
| Events | Упорядоченная история lifecycle и reconciliation |
| Logs | Отфильтрованные logs record и live tail |
| Metrics | Графики из настроенного metrics query backend |
| Traces | Spans из настроенного trace query backend |
| Download | Artifact или другое скачиваемое содержимое record |
| Commands | Операционные команды, объявленные kind |

Transfer и delete — операции ownership, а не короткие команды UI. Transfer
перемещает выбранное поддерево records к другому owner. Delete просит Graphene
финализировать это поддерево. Обе операции проверяются серверной авторизацией
и правилами resource kind.

## Topology и terminal

**Topology** объединяет ownership с явно объявленными data и control flows и
не пытается угадать скрытые сетевые зависимости. **Terminal** открывает
интерактивную сессию на подключённом агенте. Доступ к terminal привилегирован:
используйте token с минимальными правами, проверьте выбранные installation и
agent и закройте сессию после работы.

Если представление пусто, отличайте «record не создавал данные» от «query
backend не настроен». Найти слой помогут
[карта диагностики](../operations/troubleshooting.md) и
[модель наблюдаемости](../concepts/observability.md).
