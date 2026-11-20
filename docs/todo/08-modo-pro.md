# TODO 8 — El Modo Pro

**Estado:** a futuro · **SPEC:** §1, §2.1, §13 · **ADR:** [0003](../decisions/0003-logica-morse-pura-y-datos.md)

## Qué pide

Números, puntuación, prosignos y caracteres nacionales con un árbol extendido;
manipulador iámbico; temporización adaptativa; exportar y compartir
grabaciones.

## Dónde está

Fuera de v1. Lo que se hace ya por él: **el alfabeto y el layout son datos**
(ADR 0003), para que un árbol más grande no reescriba la lógica.

**De la temporización adaptativa, las pausas ya se adaptan en F1** (SPEC
§4.2, decidido por el usuario el 2026-11-20): el cierre de letra y el espacio
de palabra siguen el ritmo de quien manipula (`morse/rhythm.ts`). Queda para
aquí el umbral de raya, que sigue fijo.

<!-- docs:historia -->
## Historia
