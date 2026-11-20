# Implementar un TODO

Procedimiento para implementar uno de los TODO numerados del proyecto (una
fase de SPEC §13, o una parte de ella). Lo siguen igual una persona o
cualquier agente de IA; los comandos `/tarea` de cada herramienta solo apuntan
aquí.

Antes de escribir nada, lee lo justo y nada más:

1. `AGENTS.md`, que ya viene cargado, y `docs/estado.md`: en qué fase está el
   proyecto y el orden de lo abierto.
2. La ficha del TODO en `docs/todo/` (la parte viva, hasta "Historia") y los
   marcadores `TODO(N)` del código, para ver qué se pide y dónde.
3. **Las secciones de `SPEC.md` que cita la ficha**, y solo esas; y el ADR que
   cita, en `docs/decisions/`.

Al implementar:

- **Nada de una fase posterior**, aunque sea fácil dejarlo hecho.
- Respeta las firmas que ya existen. No refactorices de paso nada que no te
  hayan pedido.
- **Si el SPEC es ambiguo o contradictorio, pregunta** antes de decidir. Si
  una decisión documentada te bloquea, dilo y espera. Una decisión menor, a la
  ficha ("Dónde está").
- **Un paso cada vez**: cada uno, con sus tests, deja `make check` en verde.
  Si el usuario pide commits, uno por paso, sin mezclar refactor y
  funcionalidad.

Al terminar:

1. `make check` en verde, y `make e2e` si tocaste UI o entrada.
2. La ficha, al día: su "Dónde está" y, si cambia, su `**Estado:**`.
3. `docs/estado.md`: la fila del TODO en "Lo abierto", "La fase" si cambia, y
   la línea `**Al día:**`.
4. Una línea en la bitácora del día (`docs/bitacora/AAAA-MM-DD.md`), y en
   `CHANGELOG.md`, "Sin publicar", si cambia algo para quien usa la app.
5. `make docs-check` sin errores.

No hagas commit: eso lo pide el usuario.
