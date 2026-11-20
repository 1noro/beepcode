# TODO 5 — F4, grabar y reproducir

**Estado:** abierto · **Fase:** F4 · **SPEC:** §6.4 · **ADR:** [0003](../decisions/0003-logica-morse-pura-y-datos.md) · **Código:** `src/morse/recorder.ts`, `src/modes/record.ts`

## Qué pide

`recorder.ts` (captura `press`/`release` con su marca de tiempo y los
reinyecta en un keyer) y el modo Grabar (`#/record`), con la lista de
grabaciones en `localStorage` (unas 50): renombrar, borrar y reproducir.

## Hecho cuando

Una grabación reproducida produce exactamente el mismo texto, con test.

## Dónde está

Sin empezar; depende del [TODO 2](02-nucleo-y-modo-libre.md).

<!-- docs:historia -->
## Historia
