# ADR 0006 — La documentación y los agentes, como en dhtcrawler

Estado: aceptada (2026-11-20, por el usuario)

## Contexto

El proyecto se desarrolla en buena parte con agentes de IA, que llegan cada
vez sin memoria. El zip original traía un `CLAUDE.md` con reglas y un
`SPEC.md`, y pedía anotar las decisiones menores en el README. El usuario
quiere que la información se organice como en su otro proyecto, dhtcrawler,
que lo resolvió tras meses de uso.

## Decisión

- **`CLAUDE.md` es solo `@AGENTS.md`**, y **`AGENTS.md` es un enrutador**
  (≤30 KB): las reglas, las decisiones cerradas y dónde va cada información.
  Nada en él que solo entienda una herramienta.
- **`SPEC.md` sigue siendo la fuente de verdad de qué se construye**, y no se
  modifica sin que lo pida el usuario.
- **Lo vivo**, en `docs/estado.md` (≤15 KB) y en una ficha por TODO
  (`docs/todo/`), una por fase de SPEC §13 más lo que no es una fase (el
  logo). **Lo histórico**, en la bitácora (`docs/bitacora/`, un fichero por
  día) y en los ADR. **Lo que cambia para quien usa la app**, en
  `CHANGELOG.md`.
- **Las decisiones**: las que condicionan al resto, un ADR; las menores, en la
  ficha de su TODO. Ya no van a una sección "Decisiones" del README.
- **Las rutinas** (`/tarea N`, `/revisar-adr`, `/revisar-docs`), un
  procedimiento en `docs/agentes/` y **el mismo comando en Claude Code,
  OpenCode y Qwen Code** (`.claude/commands/`, `.opencode/command/`,
  `.qwen/commands/`), que solo apunta a él.
- **`make docs-check`** (`scripts/docs/`, en Node y sin dependencias)
  comprueba enlaces, comandos, tamaños, fechas, fichas contra `estado.md`, los
  `TODO(N)` del código y los ADR. Va dentro de `make check`, y en el
  pre-commit que instala `make hooks`.
- **Git**: Conventional Commits en castellano, un commit lógico por paso,
  **nunca un commit por iniciativa propia** (lo pide el usuario) y **nunca una
  línea de atribución a la IA**.

## Razones

- Un agente sin memoria necesita saber qué leer primero y dónde escribir lo
  que descubre; sin un sitio para cada cosa, la documentación se duplica y se
  contradice.
- Separar lo vivo de lo histórico deja `estado.md` corto y al día.
- Un comprobador hace que las reglas de la documentación se cumplan solas.

## Consecuencias

- Cada sesión termina con la bitácora del día, la ficha y `estado.md` al día.
- Una rutina se cambia en `docs/agentes/`; los comandos no se tocan.
- Las diferencias con dhtcrawler, a propósito: aquí no hay tomas de datos
  (`/medir`) ni historial congelado, y el comprobador es más pequeño. Si hacen
  falta, se añaden.
