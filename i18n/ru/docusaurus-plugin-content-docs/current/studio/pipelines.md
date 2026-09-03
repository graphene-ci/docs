---
sidebar_position: 3
title: Источники и pipelines
sidebar_label: Источники и pipelines
---

# Источники и pipelines

Studio управляет серверным путём от Git commit до активной неизменяемой
pipeline revision. Git остаётся системой авторинга: Studio не редактирует и не
коммитит исходники.

## Собрать и активировать

1. Откройте **Pipelines** и добавьте или выберите Git source.
2. Синхронизируйте его, чтобы разрешить refs и определить текущий commit.
3. Материализуйте выбранный commit. Сервер checkout-ит его в managed blob
   storage, а Studio показывает потоковый log операции.
4. Соберите материализованный source. Успешная сборка создаёт неизменяемую
   revision и публикует её plan и input schema.
5. Запустите **draft run**, чтобы проверить именно эту revision, не меняя
   активную revision pipeline.
6. Активируйте revision, когда она готова для обычных запусков и triggers.

Список revisions сохраняет прежние неизменяемые сборки. Для rollback
активируйте предыдущую проверенную revision, а не пересобирайте её из
движущегося имени branch.

## Учётные данные source

Аутентификацию к приватному Git передавайте серверу ссылкой на secret, а не в
URL source и не параметром pipeline. Ограничьте credential read-only доступом
к репозиторию. Source record остаётся read-only в Studio, даже если caller
может синхронизировать или пересобирать его.

## Что проверять

На каждом шаге смотрите log операции и созданный record, а не только состояние
кнопки:

- ошибки sync обычно относятся к ref или credentials;
- ошибки materialization — к checkout, archive или blob storage;
- ошибки build приходят из выбранного runtime и исходников;
- ошибка draft run относится к исполнению pipeline, а не к activation.

Эквивалентный CLI-путь описан в
[`graphenectl pipeline`](../graphenectl/pipeline.md), серверный контракт — в
[Source и Revisions API](../api/management.md#sourceapi).
