# The docs development cycle. `make dev` is the loop; CI runs
# `make check` on every PR and deploys `make build` from main.
.PHONY: dev build serve check typecheck clean

dev: ## live-reload dev server on http://localhost:3000/docs/
	yarn start

build: ## production build into build/
	yarn build

serve: build ## serve the production build locally
	yarn serve

typecheck:
	yarn typecheck

check: typecheck build ## what CI runs

clean:
	yarn clear
	rm -rf build
