---
sidebar_position: 6
title: Совместимость и ограничения
sidebar_label: Совместимость
---

# Совместимость и ограничения

Это подтверждённая сейчас поверхность совместимости. Отсутствие в таблице
означает, что диапазон поддержки не установлен, а не что сочетание работает.

| Область | Текущий контракт |
|---|---|
| Примеры пайплайнов и библиотеки ресурсов | модули Go 1.26.5 |
| Pipeline SDK и agent | декларируют Go 1.25.7; текущим примерам нужен более новый Go |
| Server | модуль Go 1.26.5 |
| Server-side materialization | встроенный Go runtime сообщает 1.26 |
| Self-built worker image | только Linux/amd64 |
| Machine agent | Linux; `runc` по умолчанию, `exec` для development |
| Service агента | generated installer поддерживает systemd; другой init требует ручного service wiring |
| Development control plane | Docker с Compose и доступ к Docker socket |
| Разработка Studio | Node.js 22.23.1; web renderer и Electron packaging commands |
| Kubernetes-библиотека | нативные Go API types; диапазон Kubernetes/provider версий не опубликован |

Версионированного обещания совместимости между независимо выпускаемыми server,
agent, pipeline SDK, Studio и generated Management API bindings пока нет.
Тестируйте их согласованные ревизии и перегенерируйте bindings Studio из
контракта целевого сервера.

## Известные функциональные ограничения

- `dev` не реализован: локальный plan работает, для execution нужен сервер.
- Production deployment, HA, backup/restore и upgrade procedures не
  поставляются.
- Деревья Git sources доступны только для чтения.
- Manual start при `Queue` отклоняется, пока активен другой run; pending slot
  принадлежит автоматическим triggers.
- List watch в `graphenectl` поллит; observe streams и run watch работают push.
- Безвозвратно потерянную agent machine пока нельзя похоронить поддерживаемым
  CLI.
- Lifecycle секретов через внешний KMS/Vault отсутствует.

Перед оценкой дизайна прочитайте [Текущее состояние](../start/current-state.md),
а перед подключением реальной инфраструктуры — [Безопасность](security.md).
