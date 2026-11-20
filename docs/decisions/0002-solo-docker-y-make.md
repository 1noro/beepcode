# ADR 0002 — En el host, solo Docker y make

Estado: aceptada (2026-11-20, de SPEC §1, §10.3 y §10.5); implementada en F0
([TODO 1](../todo/01-andamiaje.md))

## Contexto

El proyecto tiene que poder desarrollarse en Linux, macOS y Windows (WSL2) sin
instalar Node ni gestionar sus versiones, y CI tiene que hacer exactamente lo
mismo que el equipo local.

## Decisión

- En el host **solo Docker (con Compose v2) y `make`**. Nunca `node`, `npm`,
  `npx` ni `vite` en el host.
- **El `Makefile` es la única interfaz**: un objetivo por tarea, documentado con
  `##`. `make` a secas los lista.
- **Node en un contenedor**, con la versión LTS fijada en un solo sitio
  (`ARG NODE_VERSION` del `Dockerfile`) y reflejada en `engines`. Imagen
  `bookworm-slim` (glibc), para que `node_modules` valga también en la imagen
  de Playwright.
- **El repo se monta en `/app`** y los contenedores corren con el uid:gid del
  host (`HOST_UID`/`HOST_GID`): nada de lo que generan es de root.
- **`node_modules/` vive en el proyecto** (el editor ve los tipos) y se instala
  solo, con un marcador (`node_modules/.deps-stamp`).

## Razones

- Un solo requisito en el host, igual en los tres sistemas y en CI.
- La versión de Node no depende de lo que tenga instalado cada uno.
- Lo que pasa en local pasa en CI, porque CI llama a los mismos objetivos.

## Consecuencias

- Cada comando paga el arranque de un contenedor (~1 s). Es aceptable.
- El servidor de desarrollo necesita `--host 0.0.0.0` y, en Docker Desktop,
  vigilar por polling (`DEV_POLLING=1`).
- En la LAN, `http://192.168.x.x` no es un contexto seguro: para la PWA en el
  móvil, `make dev-https` o la URL de Pages.

## Al implementarlo (2026-11-20)

- **Node 26.13.1**, la LTS del momento.
- **`make e2e` comparte la red del servicio `web`** (`network_mode:
  service:web`) y entra por `http://localhost`: así el service worker se
  registra y se puede probar sin conexión. Por `http://web` Chromium no lo
  trata como contexto seguro, ni con `--unsafely-treat-insecure-origin-as-secure`.
- **`make check`** (lint, typecheck, test, build y docs-check) es lo que se
  pasa al terminar una tarea; **`make ci`** le añade `deps`, `e2e` y
  `owner-check`, que falla si algo del repo no es del usuario del host.
