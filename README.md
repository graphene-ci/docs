# docs

Единственный репозиторий пользовательской документации Graphene. Сайт собран на
Docusaurus в docs-only режиме, поддерживает английскую и русскую локали и
рендерит Mermaid.

## Разработка

```bash
make configure
make dev        # EN: http://localhost:3000/docs/
make dev-ru     # RU: http://localhost:3002/docs/ru/
make check      # typecheck и production build обеих локалей
make serve      # готовый двуязычный build на :3000
```

Dev-сервер компилирует одну локаль. Не запускайте `make dev` и `make dev-ru`
одновременно: они используют общий каталог `.docusaurus`. Для одновременной
проверки обеих локалей используйте `make serve`.

Английские страницы лежат в `docs/`, русские — в
`i18n/ru/docusaurus-plugin-content-docs/current/`. Дерево каталогов формирует
sidebar автоматически; страницы и позиции категорий должны оставаться
симметричными.

## Публикация

Push в `main` собирает и публикует сайт на
<https://graphene-ci.github.io/docs/> через `.github/workflows/ci.yml`.
Pull request выполняет тот же `make check` без публикации.
