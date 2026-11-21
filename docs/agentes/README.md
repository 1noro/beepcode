# Las rutinas del proyecto

Lo que se le pide a menudo a un agente, o hace una persona a mano. Cada rutina
es un procedimiento en texto llano en esta carpeta y un comando que solo
apunta a él, igual en las tres herramientas (`.claude/commands/`,
`.opencode/command/` y `.qwen/commands/`; `make docs-check` comprueba que
coinciden). **El procedimiento se cambia aquí, nunca en el comando.**

En Claude Code, OpenCode y Qwen Code se llaman igual: `/tarea 2`,
`/revisar-docs`… Sin agente, basta con leer el procedimiento y seguirlo.

| Comando | Para qué | Cuándo |
|---|---|---|
| `/tarea N` ([`tarea.md`](tarea.md)) | Implementar el TODO N (una fase, o una parte): lee lo justo (`AGENTS.md`, `estado.md`, su ficha, el SPEC que cita y su ADR), no adelanta nada de otra fase y deja la documentación al día. No commitea | Para empezar cualquier TODO |
| `/revisar-adr` ([`revisar-adr.md`](revisar-adr.md)) | Comprobar que el código respeta los ADR, las reglas de `AGENTS.md` y el SPEC, punto por punto. Informa; no arregla nada sin preguntar | Al cerrar una fase, o antes de un tag |
| `/revisar-docs` ([`revisar-docs.md`](revisar-docs.md)) | Poner al día la documentación viva: corrige los datos desfasados sin preguntar y solo propone cerrar TODO o cambiar reglas | **Cada semana, a mano**: no la programa nada. `make docs-check` lo recuerda con una nota cuando la última (`**Revisada:**`, en `estado.md`) pasa de 7 días |
| `/desplegar [versión]` ([`desplegar.md`](desplegar.md)) | Publicar la rama: commitea lo pendiente, sube la versión (changelog, `package.json`, estado), abre la PR, la lleva a `main` con su tag en un solo push, espera a que `deploy.yml` pase y resume el despliegue. Lanzarlo es la petición de commitear, subir y mergear | Cuando una rama está lista para publicarse |

## Las herramientas de la documentación

| Comando | Para qué |
|---|---|
| `make docs-check` | Comprueba los enlaces, `CLAUDE.md`, los tamaños de `AGENTS.md` y `estado.md`, que cada rutina tenga su comando igual en las tres herramientas, las fechas de `estado.md`, las fichas contra "Lo abierto", los `TODO(N)` del código, los ADR y la bitácora. Va dentro de `make check` |
| `make hooks` | Una vez por clon: instala el pre-commit de `.githooks/`, que pasa `make docs-check` antes de cada commit (`git commit --no-verify` para saltárselo a sabiendas) |
