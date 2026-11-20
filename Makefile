# La única interfaz del proyecto (SPEC §10.5, ADR 0002). En el host solo hacen
# falta Docker (con Compose v2) y make: Node, npm y lo demás corren en
# contenedores, con el uid:gid del usuario del host.
#
# `make` a secas lista los objetivos: cada uno se documenta con `## …`.

.DEFAULT_GOAL := help
SHELL := /bin/bash

HOST_UID := $(shell id -u)
HOST_GID := $(shell id -g)
BASE_PATH ?= /
# La versión que muestra la app, como en dhtcrawler: el tag, o el commit, y
# -dirty si hay cambios sin commitear. Llega al build por VERSION (src/version.ts).
VERSION := $(shell git describe --tags --dirty --always 2>/dev/null || echo dev)
export HOST_UID HOST_GID BASE_PATH VERSION

COMPOSE := docker compose
RUN := $(COMPOSE) --progress quiet run --rm --build node
DEPS := node_modules/.deps-stamp
CACHE := .cache/home

.PHONY: help deps dev dev-https lint format typecheck test test-watch coverage \
	build web e2e check ci npm shell icons docs-check hooks owner-check \
	down clean distclean

help: ## lista los objetivos
	@awk 'BEGIN { FS = ":.*## " } /^[a-zA-Z_-]+:.*## / { printf "  \033[36m%-12s\033[0m %s\n", $$1, $$2 }' $(MAKEFILE_LIST)

# Las cachés de npm y el HOME de los contenedores, creados aquí y no por
# Docker, para que sean del usuario del host.
$(CACHE):
	mkdir -p $(CACHE) .cache/npm

# Las librerías se instalan solas: todo lo que necesita node_modules depende de
# este marcador, que se rehace con `npm ci` si falta o si cambian package.json o
# package-lock.json.
$(DEPS): package.json package-lock.json | $(CACHE)
	$(RUN) sh -c 'npm ci && touch $(DEPS)'

deps: | $(CACHE) ## fuerza la descarga de las librerías (normalmente es automática)
	$(RUN) sh -c 'npm ci && touch $(DEPS)'

dev: $(DEPS) ## desarrollo con recarga en caliente → http://localhost:5173
	$(COMPOSE) run --rm --build --service-ports dev

# La «Network» que imprime Vite es la IP del contenedor, que el móvil no ve:
# la buena es la de este equipo en la LAN (ip en Linux, ipconfig en macOS).
dev-https: $(DEPS) ## ídem con HTTPS, para probar la PWA desde un móvil en la LAN
	@lan=$$( { ip -4 route get 1.1.1.1 2>/dev/null | awk '{ for (i = 1; i < NF; i++) if ($$i == "src") print $$(i + 1) }'; \
		ipconfig getifaddr en0 2>/dev/null; } | head -1 ); \
	echo "En el móvil: https://$${lan:-<la IP de este equipo>}:5173 (no la «Network» de Vite, que es la del contenedor)"
	DEV_HTTPS=1 $(COMPOSE) run --rm --build --service-ports dev

lint: $(DEPS) ## ESLint y Prettier en modo comprobación
	$(RUN) npm run lint

format: $(DEPS) ## Prettier escribiendo los cambios
	$(RUN) npm run format

typecheck: $(DEPS) ## tsc --noEmit
	$(RUN) npm run typecheck

test: $(DEPS) ## Vitest (unit), una vez
	$(RUN) npm test

test-watch: $(DEPS) ## Vitest en modo vigilancia
	$(RUN) npm run test:watch

coverage: $(DEPS) ## Vitest con cobertura, en coverage/
	$(RUN) npm run coverage

build: $(DEPS) ## build de producción en dist/ (BASE_PATH=/beepcode/ para Pages)
	$(RUN) npm run build

web: ## el build servido por nginx → http://localhost:8080
	$(COMPOSE) up -d --build --wait web
	@echo "beepcode en http://localhost:8080 (make down para pararlo)"

e2e: $(DEPS) ## Playwright (escritorio y móvil emulado) contra web; informe en playwright-report/
	$(COMPOSE) up -d --build --wait web
	$(COMPOSE) run --rm e2e

check: lint typecheck test build docs-check ## lo que hay que pasar al terminar una tarea (más e2e si tocaste UI)

ci: deps check e2e owner-check ## todo, igual que en GitHub Actions

npm: | $(CACHE) ## válvula de escape: make npm ARGS="install -D foo"
	$(RUN) npm $(ARGS)

shell: | $(CACHE) ## shell en el contenedor de herramientas
	$(COMPOSE) --progress quiet run --rm --build node bash

icons: $(DEPS) ## regenera los iconos de public/ desde el maestro de assets/icon/
	$(RUN) npm run icons

docs-check: | $(CACHE) ## comprueba la documentación (enlaces, comandos, estado, fichas, ADR)
	@$(RUN) node scripts/docs/check.ts

hooks: ## una vez por clon: el pre-commit de .githooks (make docs-check)
	git config core.hooksPath .githooks
	@echo "pre-commit instalado: make docs-check antes de cada commit"

owner-check: ## falla si algo del repo no es del usuario del host
	@bad=$$(find . -path ./.git -prune -o ! -user $(HOST_UID) -print | head -20); \
	if [ -n "$$bad" ]; then \
		echo "Esto no es de $(HOST_UID) (es un bug del entorno, ver AGENTS.md):"; \
		echo "$$bad"; exit 1; \
	fi

down: ## para y elimina los contenedores del proyecto
	$(COMPOSE) --profile '*' down --remove-orphans

clean: down ## down, y borra dist, coverage, los informes y .cache
	rm -rf dist dev-dist coverage playwright-report test-results .cache

distclean: clean ## clean, y borra node_modules y las imágenes del proyecto
	$(COMPOSE) --profile '*' down --rmi local --remove-orphans
	rm -rf node_modules
