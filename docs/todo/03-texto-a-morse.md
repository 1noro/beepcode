# TODO 3 — F2, texto a Morse

**Estado:** abierto · **Fase:** F2 · **SPEC:** §4.1, §6.5 · **ADR:** [0003](../decisions/0003-logica-morse-pura-y-datos.md) · **Código:** `src/morse/player.ts`, `src/modes/text.ts`

## Qué pide

`player.ts` (texto o código → secuencia temporizada de eventos) y el modo
Texto → Morse (`#/text`): normalizar a A–Z, saltar lo que no está en el
alfabeto, reproducir, pausar, parar y bucle, con el carácter actual resaltado,
su camino encendido y la transcripción `·−`.

## Hecho cuando

La reproducción es precisa a la velocidad configurada y con Farnsworth, con
tests del player en reloj falso.

## Dónde está

Sin empezar; depende del [TODO 2](02-nucleo-y-modo-libre.md).

<!-- docs:historia -->
## Historia
