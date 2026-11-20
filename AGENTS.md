# AGENTS.md

Directrices para trabajar en este repositorio, para una persona o un agente de
IA: Claude Code, OpenCode y Qwen Code. Las tres lo leen solas (Claude Code, por
el `@AGENTS.md` de `CLAUDE.md`), y nada de aquí depende de una concreta. **Es
un enrutador, corto a propósito** (≤30 KB, lo comprueba `make docs-check`): las
reglas y dónde está cada cosa. Cómo va el proyecto hoy, en
[`docs/estado.md`](docs/estado.md), lo segundo que se lee al empezar.

**Con el usuario se habla en castellano.** El código y la documentación siguen
sus propias reglas de idioma ("Convenciones de código").

## Qué es esto

**beepcode** es una SPA para aprender y practicar código Morse, inspirada en
una tarjeta "fidget" física: **un único pulsador** (la duración decide punto o
raya) y **un árbol Morse** que se ilumina siguiendo lo tecleado (verde = punto,
rojo = raya), con tono mientras se pulsa. Encima, lo que la tarjeta no tiene:
histórico, modos de aprendizaje, escucha, grabación y texto a Morse. PWA
instalable y sin conexión, sin backend, en cinco idiomas, publicada en GitHub
Pages.

**[`SPEC.md`](SPEC.md) define qué se construye**, y se construye **por fases**
(SPEC §13): no se adelanta nada de una fase posterior. Cómo se usa y cómo se
arranca, en el [README](README.md).

Es un proyecto personal de un solo mantenedor (1noro). **La simplicidad gana a
la elegancia**, y el bundle pequeño a la comodidad de una dependencia.

| Carpeta | Qué hace |
|---|---|
| `src/main.ts` | el arranque; con F1, el router por hash (`#/free`, `#/learn`…) |
| `src/morse/` | **lógica pura**: alfabeto, árbol, temporización, keyer, player, recorder (ADR 0003) |
| `src/audio/`, `src/input/` | Web Audio y vibración; el pulsador (Pointer Events) y el teclado |
| `src/ui/`, `src/modes/` | el árbol SVG, la cinta, el pulsador, los ajustes; un fichero por modo |
| `src/state/` | el almacén observable y los ajustes persistidos (con versión de esquema) |
| `src/i18n/` | `t()`, los diccionarios (`en.json` es la referencia) y las listas de palabras |
| `src/styles/` | `tokens.css` (las variables de tema) y `base.css` |
| `src/pwa.ts` | el service worker y el aviso de versión nueva |
| `tests/unit/`, `tests/e2e/` | Vitest; Playwright (escritorio y móvil emulado) |
| `scripts/docs/` | el comprobador de la documentación (`make docs-check`) |
| `assets/icon/` | el maestro del icono; `make icons` genera `public/` |

Las carpetas que aún no existen llegan con su fase (SPEC §10.2).

## Dónde va cada información

**El código es la fuente de verdad de cómo funciona algo; `SPEC.md`, de qué
tiene que hacer.** La documentación guarda el porqué, las decisiones y el
estado de lo abierto, y enlaza a ficheros (`ruta` o `módulo.símbolo`), commits
o secciones del SPEC (`SPEC §4.2`) en vez de copiarlos. Dos lectores que no se
mezclan: **el producto** (README, `docs/` sueltos, para quien lo usa o lo
traduce) y **el proceso de desarrollo** (lo de abajo).

| Información | Dónde | Cómo |
|---|---|---|
| Qué se construye y en qué fases | `SPEC.md` | **no se modifica sin que lo pida el usuario**: se le proponen los cambios |
| Cómo va el proyecto hoy: la fase, lo publicado, lo abierto y su orden, lo pendiente del usuario | `docs/estado.md` | vivo: se reescribe, ≤15 KB; sus líneas `**Al día:**` y `**Revisada:**` |
| Un TODO abierto (una fase, el logo…): qué pide, dónde está, cuándo está hecho | `docs/todo/`, `NN-slug.md` | vivo arriba, historia literal bajo `<!-- docs:historia -->`; al cerrarse, `**Estado:** cerrado` y sale de `estado.md` |
| Por qué se decidió algo | su ADR en `docs/decisions/` | uno por decisión; luego, solo añadidos fechados |
| Lo que pasó en una sesión | `docs/bitacora/`, un fichero por día | histórico: solo se añade, corto, enlazando |
| Lo que cambia para quien usa la app | `CHANGELOG.md`, "Sin publicar" | ver "Flujo de git" |
| Las traducciones y su revisión | [`docs/traducciones.md`](docs/traducciones.md) | producto |
| Normas de trabajo | este fichero | — |

- **El orden de confianza**: el código; luego `SPEC.md` (para lo que aún no
  existe); luego `estado.md` y la ficha; luego el ADR; la bitácora, solo para
  la historia. **Si el código y el SPEC no dicen lo mismo, es un bug o una
  decisión: pregunta.**
- **Una decisión menor** (una que el SPEC deja abierta y no condiciona a nada
  más) va a la ficha de su TODO, en "Dónde está". **Si condiciona al resto, un
  ADR.** Si contradice al SPEC, **se pregunta antes**.
- **Lo histórico no se reescribe** (ADR, bitácora, `CHANGELOG.md`): se añade un
  apartado fechado. Sí se recalculan sus enlaces al mover un fichero.
- **Fechas en ISO** (`2026-11-20`) en los ficheros; **horas en UTC**, y con el
  usuario, UTC y su hora (CET).
- **Al terminar una sesión**: la bitácora del día, la ficha y `estado.md` al
  día, y `make docs-check` sin errores.

## Decisiones cerradas — NO reabrir sin motivo nuevo

Razonadas en [`docs/decisions/`](docs/decisions/README.md). Si crees que alguna
está mal, dilo antes de tocar código; no la cambies por iniciativa propia.

1. **SPA sin backend y sin framework** (ADR 0001): Vite + TypeScript `strict`,
   DOM y SVG a mano con componentes pequeños. Todo el estado, en el navegador.
2. **En el host, solo Docker y `make`** (ADR 0002). Node vive en un contenedor,
   con su versión en un solo sitio (`ARG NODE_VERSION` del `Dockerfile`).
3. **`src/morse/` es lógica pura, y el alfabeto y el layout del árbol son
   datos** (ADR 0003), preparados para el "Modo Pro". Los modos componen keyer,
   tablero y audio a través de los eventos del keyer, que no conoce a nadie.
4. **GitHub Pages con rutas por hash** (ADR 0004): sin `404.html`; el base path
   sale de `BASE_PATH`. CI y despliegue usan **los mismos objetivos de `make`**
   que en local.
5. **El nombre es beepcode; el código, GPL-3.0-or-later; el logo y los textos,
   CC BY-SA 4.0** (ADR 0005).
6. **La documentación y los agentes, como en dhtcrawler** (ADR 0006): este
   enrutador, `estado.md`, fichas, ADR, bitácora y rutinas iguales en las tres
   herramientas. **Ni commits por iniciativa propia ni atribución a la IA.**

## Reglas que no se saltan

### El entorno: solo Docker y make

- **Nunca** ejecutes `node`, `npm`, `npx`, `pnpm`, `yarn` ni `vite` en el
  host, aunque estén instalados. **Toda tarea es un objetivo del `Makefile`**;
  si falta uno, se añade documentado con `##`, en vez de lanzar el comando
  suelto. Para lo demás de npm, `make npm ARGS="…"` o `make shell`.
- **Las librerías se instalan solas**: lo que necesita `node_modules/` depende
  de `node_modules/.deps-stamp`, que se rehace con `npm ci` si falta o cambian
  `package.json` o `package-lock.json`. Se añade una con `make npm ARGS="install
  -D <paquete>"` y se versionan los dos ficheros.
- **Lo que generan los contenedores es del usuario del host**
  (`HOST_UID`/`HOST_GID`, que exporta el `Makefile`; nunca `UID`, que es de
  solo lectura en bash). **Si aparece algo de root, es un bug del entorno**:
  se arregla, no se hace `chown`. `make owner-check` (dentro de `make ci`) lo
  comprueba.
- **La imagen de Playwright de `compose.yaml` y `@playwright/test` llevan la
  misma versión exacta** (sin `^`). Si cambias una, cambia la otra.
- **TypeScript se queda en 6.0.x** (`~6.0.3`) mientras `typescript-eslint` no
  admita la 7 (su `peerDependencies` dice `<6.1.0`, noviembre de 2026).

### El código

- TypeScript `strict`; **sin `any`** salvo justificado en un comentario.
- **`src/morse/` no importa nada del DOM, del audio ni de la UI**, ni nada de
  fuera de `src/morse/`. ESLint lo impide (`eslint.config.js`). Todo lo de esa
  carpeta lleva tests unitarios **con reloj falso**, y su cobertura no baja del
  90 % (`vitest.config.ts`).
- **El alfabeto y el layout del árbol son datos**, no código. El test
  obligatorio de SPEC §2.2: el camino ROOT→nodo reproduce su código y cada
  arista llega a un nodo de la forma correcta.
- **El pulsador, con Pointer Events** (`pointerdown`/`pointerup`), **nunca
  `click`**, con `setPointerCapture` y un solo puntero activo. En el teclado se
  ignora `event.repeat`. Al perder el foco con la tecla pulsada, se fuerza el
  "soltar" (SPEC §3.5, §3.6).
- **Todo texto visible pasa por `t()`**; ninguna cadena va escrita en la UI.
  **`en.json` es la referencia de claves**, y un test exige las mismas en los
  cinco idiomas. Lo único que no se traduce: el nombre de cada idioma en su
  propia lengua (`LOCALE_NAMES`).
- **Los colores salen solo de las variables de `tokens.css`**; ninguno escrito
  en un componente. Se respeta `prefers-reduced-motion` y contraste AA.
- **Sin dependencias de runtime nuevas sin justificarlo** en un ADR: objetivo,
  bundle inicial < 100 kB gzip sin iconos. Hoy no hay ninguna (solo el
  `workbox-window` que mete `vite-plugin-pwa`).
- **Los `TODO(N)` del código** dicen qué falta, con el número de su ficha
  (`docs/todo/`); `make docs-check` exige que la ficha exista y esté abierta.

### La PWA y el despliegue

- **Todo respeta el base path**: `import.meta.env.BASE_URL` en el código,
  rutas relativas en el manifest (`start_url: '.'`). En Pages es `/beepcode/`.
- **El service worker necesita un contexto seguro**: `localhost` y Pages sí,
  `http://192.168.x.x` no. Por eso `make e2e` entra por `localhost` (comparte
  la red de `web`) y el móvil en la LAN se prueba con `make dev-https`.
- **El icono sale de `make icons`**, desde el maestro de `assets/icon/`; lo
  generado en `public/` va en el repo y no se edita a mano.

## Comandos

```bash
make                  # la ayuda: todos los objetivos
make dev              # Vite con recarga en caliente → http://localhost:5173
make dev-https        # ídem con HTTPS, para el móvil en la LAN
make check            # lint + typecheck + test + build + docs-check: lo que hay que pasar
make e2e              # Playwright contra el build en nginx (si tocaste UI o entrada)
make ci               # todo, como GitHub Actions: deps + check + e2e + owner-check
make web              # el build en nginx → http://localhost:8080
make build BASE_PATH=/beepcode/   # el build como en Pages
make format | coverage | test-watch | icons
make npm ARGS="…" | shell         # válvulas de escape
make docs-check | hooks           # la documentación; el pre-commit, una vez por clon
make down | clean | distclean
```

## Convenciones de código

- **El código va en inglés**: identificadores, ficheros, comentarios y tests.
  **La documentación (`SPEC.md`, `docs/`, los ADR y este fichero), en
  castellano.** Los textos de la UI, por i18n; inglés por defecto.
- Glosario: pulsador / manipulador → *key*, keyer → *keyer*, punto / raya →
  *dot* / *dash*, árbol → *tree* (el SVG, *board*), nodo → *node*, camino →
  *path*, cinta → *tape*, pausa → *gap*, letra → *letter*, tono → *tone*,
  grabación → *recording*, ajustes → *settings*, ayuda → *hint*, objetivo (en
  Aprender) → *target*, racha → *streak*.
- Componentes pequeños, sin clases si basta una función. Sin frameworks ni
  generación de código.

## Flujo de git

- [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`,
  `fix:`, `test:`, `docs:`, `build:`, `ci:`, `chore:`…), **en castellano**.
- **Un commit lógico por paso**; no se mezcla refactor y funcionalidad.
- Los commits van en la rama en la que se esté. **No cambiar de rama, ni crear
  una, ni forzar contra `main`**, salvo que el usuario lo pida.
- **Nunca una línea de atribución a un agente de IA o su herramienta**
  (`Co-Authored-By`, "Generated with …") en commits ni PRs, aunque la
  herramienta lo haga por defecto.
- **Nunca commitear por iniciativa propia**, ni al terminar una tarea entera:
  se deja sin commitear para que el usuario lo revise, y se commitea solo
  cuando lo pide en ese turno.
- **`CHANGELOG.md`**: entre tags se anota en "Sin publicar", por lo que cambia
  para quien usa la app (Añadido, Cambiado, Corregido, Documentación). Al
  etiquetar, "Sin publicar" pasa a la versión con su fecha: changelog,
  commit, tag, push.

## Al trabajar en una tarea

1. Lee lo justo: este fichero, `docs/estado.md`, la ficha del TODO, las
   secciones del SPEC que cita y su ADR.
2. **Nada de una fase posterior.** No refactorices de paso lo que no te han
   pedido. Respeta las firmas que ya existen.
3. Si algo del SPEC es ambiguo o contradictorio, o una decisión documentada te
   bloquea, **dilo y espera**; no decidas ni la cambies.
4. **Antes de darla por terminada**: `make check` en verde, y `make e2e` si
   tocaste UI o entrada.
5. Al terminar: la ficha, `estado.md`, la bitácora del día y el `CHANGELOG.md`
   si cambia algo para quien usa la app.

Las rutinas (`/tarea N`, `/revisar-adr`, `/revisar-docs`), en
[`docs/agentes/`](docs/agentes/README.md): un procedimiento en texto llano y un
comando igual en las tres herramientas que solo apunta a él. **El
procedimiento se cambia en `docs/agentes/`, nunca en el comando.** `CLAUDE.md`
es solo `@AGENTS.md`. **Nada en este fichero que solo entienda una
herramienta.**
