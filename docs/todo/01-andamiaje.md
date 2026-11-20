# TODO 1 — F0, el andamiaje

**Estado:** cerrado · **Fase:** F0 · **SPEC:** §10, §13 · **ADR:** [0002](../decisions/0002-solo-docker-y-make.md), [0004](../decisions/0004-github-pages-y-rutas-hash.md) · **Código:** `Makefile`, `Dockerfile`, `compose.yaml`, `vite.config.ts`, `.github/workflows/`

## Qué pide

`Makefile`, `Dockerfile` y `compose.yaml` (SPEC §10.3, §10.5); Vite + TS,
ESLint/Prettier, Vitest y Playwright, todo instalado desde un contenedor; CI y
despliegue a Pages con `make`; PWA mínima, tokens de tema e i18n base.

## Hecho cuando

En un equipo con solo Docker y make, `make ci` en verde y `make web` sirve una
página "hola" instalable. Ningún fichero generado es de root. **Pages,
publicado.**

## Dónde está

**Cerrado el 2026-11-20**: commiteado en `6f02c36` y `25ce416`, con CI y
Deploy en verde en GitHub Actions, y publicado en
`https://1noro.github.io/beepcode/` (Pages con Source: GitHub Actions).

- `make ci` en verde en local: lint, typecheck, 21 tests unitarios, build,
  `docs-check`, 10 e2e (5 en escritorio y 5 en móvil emulado, incluido
  recargar sin conexión) y `owner-check`.
- **La página "hola"**: el nombre, el lema, un selector de idioma (los cinco)
  y el aviso de versión nueva (`src/pwa.ts`). Sin router todavía: llega con
  F1 (`TODO(2)` en `src/main.ts`).
- **El icono es provisional** (un punto verde y una raya roja sobre fondo
  oscuro), hasta el logo del usuario ([TODO 7](07-logo.md)).

Decisiones menores tomadas aquí:

- **Versiones**: Node 26.13.1 (LTS), Vite 8, Vitest 5, Playwright 1.65.1,
  ESLint 10, `vite-plugin-pwa` 2. **TypeScript 6.0.x**, porque
  `typescript-eslint` aún no admite la 7.
- **Los iconos los genera `@vite-pwa/assets-generator`** (`make icons`, con el
  preset `minimal-2023`): `pwa-64/192/512`, `maskable-icon-512`,
  `apple-touch-icon-180` y `favicon.ico`.
- **`make e2e` entra por `localhost`**, compartiendo la red de `web`, para que
  el service worker funcione (añadido al ADR 0002).
- **Prettier no toca los `.md`**: los cuida `make docs-check`.
- **El servicio `node` va en el perfil `tools`, `dev` en `dev` y `e2e` en
  `test`**: `docker compose up` a secas solo levanta `web`.
- **El aviso de versión nueva va ya en F0** (SPEC §9), porque sin él una PWA
  instalada no se actualizaría.

<!-- docs:historia -->
## Historia

- 2026-11-20: hecho en la primera sesión, junto con la documentación
  (ADR 0006).
