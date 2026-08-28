.DEFAULT_GOAL := help
.PHONY: help setup build run test bench check lint lint-docs typecheck format

# Override to run a second dev server alongside the first, e.g. make run PORT=3001
PORT ?= 3000

help: ## Show available targets
	@grep -E '^[a-zA-Z_-]+:.*## ' $(MAKEFILE_LIST) | awk -F':.*## ' '{printf "%-12s %s\n", $$1, $$2}'

setup: ## Install dependencies from the lockfile (idempotent)
	@command -v node >/dev/null || { echo "Missing node. Install $$(cat .nvmrc): brew install node@22"; exit 1; }
	@req=$$(sed 's/^v//' .nvmrc); cur=$$(node -v | sed 's/^v//'); \
	  [ "$${req%%.*}" = "$${cur%%.*}" ] && [ "$$req" = "$$(printf '%s\n%s\n' "$$req" "$$cur" | sort -V | head -1)" ] \
	  || { echo "Node $$cur found, .nvmrc requires $$req or a later 22.x. Run: nvm install && nvm use"; exit 1; }
	npm ci

build: ## Typecheck, then production build into ./build (what Cloudflare Pages serves)
	npm run build

run: ## Start the Vite dev server (PORT=3000 by default)
	PORT=$(PORT) npm start

test: ## Run the Vitest suite once (no watch mode)
	npm test

bench: ## Run the scoring benchmarks (not part of `make check`)
	npm run bench

check: lint lint-docs typecheck test ## Lint, typecheck, test, and format-check everything
	npm run prettier

lint: ## ESLint over the repo
	npm run lint

lint-docs: ## Check the CLAUDE.md tree: structure, duplication, length
	@command -v python3 >/dev/null || { echo "Missing python3"; exit 1; }
	.claude/scripts/lint_claude_md.py check .

typecheck: ## tsc --noEmit for src/ and functions/ separately
	npm run typecheck

format: ## Apply eslint --fix, then prettier (formatter runs last, so it wins)
	npm run format
