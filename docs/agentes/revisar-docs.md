# Revisar la documentación

Procedimiento para poner al día la documentación viva. Lo siguen igual una
persona o cualquier agente de IA; los comandos `/revisar-docs` de cada
herramienta solo apuntan aquí. Qué va en cada sitio, en `AGENTS.md`, "Dónde va
cada información".

## Qué se mira

1. **`make docs-check`**, y arregla cada error.
2. **[`estado.md`](../estado.md) contra el repo**:
   - "La fase" y "Lo publicado", contra `git log`, los tags y Pages.
   - "Lo abierto": una fila por ficha abierta, con el mismo estado que la
     ficha y en el orden de las fases.
   - "Lo pendiente del usuario": lo que ya hizo, fuera (a la bitácora).
   - La línea `**Al día:**`.
3. **Cada ficha de `docs/todo/`**: su "Dónde está", contra el código.
4. **`AGENTS.md`**: las reglas, contra el código (nombres, versiones,
   objetivos del `Makefile`), y sin historia.
5. **Los documentos del producto** (README, `docs/traducciones.md`,
   `assets/icon/README.md`): que no digan nada que el código ya no hace.
6. **`SPEC.md` contra lo hecho**: si el código se ha apartado del SPEC, **no
   se toca el SPEC**: se propone el cambio al usuario.
7. **La bitácora**: cada sesión, con su día.

## Qué se corrige y qué se propone

- **Se corrige sin preguntar** lo que es un dato desfasado: un nombre de
  código, una versión, un enlace, el estado de una ficha que `estado.md`
  contradice, la línea `**Al día:**`.
- **Solo se propone** lo que cambia una decisión o el plan: cerrar un TODO,
  reordenar lo abierto, cambiar una regla de `AGENTS.md`, un ADR o el SPEC.
- **Lo histórico no se reescribe**: los ADR, la bitácora y el `CHANGELOG.md`.

## Al terminar

La fecha de hoy en `**Revisada:**`, arriba de `estado.md`; una línea en la
bitácora del día; `make docs-check` sin errores, y un informe corto: qué se
corrigió y qué se propone. No hagas commit: eso lo pide el usuario.

## Cuándo

**Cada semana, y la lanza el usuario a mano**: nada la programa. Para
acordarse, `make docs-check` (y con él `make check` y el pre-commit) da una
nota cuando `**Revisada:**` pasa de 7 días; es una nota, no un error, así que
no frena ningún commit.
