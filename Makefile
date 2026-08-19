# The docs development cycle. `make dev` is the loop; CI runs
# `make check` on every PR and deploys `make build` from main.
.PHONY: dev build serve check typecheck clean

dev: ## live-reload dev server on http://localhost:3000/docs/
	pnpm start

build: ## production build into build/
	pnpm build

serve: build ## serve the production build locally
	pnpm serve

typecheck:
	pnpm typecheck

check: typecheck build ## what CI runs

clean:
	pnpm clear
	rm -rf build
