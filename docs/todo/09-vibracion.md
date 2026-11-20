# TODO 9 — Refinar la vibración

**Estado:** a futuro · **SPEC:** §5, §7

## Qué pide

Una vibración que acompañe al manipular de forma fiable en Android, y quizá
que vuelva a venir activada por defecto.

## Dónde está

En F1 es un toque de 30 ms al pulsar, **desactivado por defecto**
(`audio/tone.createVibration`). En un Pixel 7 (Android 17) con Brave:

- una vibración mientras se pulsa, cortada con `vibrate(0)`, seguía durante
  segundos;
- en pulsos cortos renovados, igual;
- un toque suelto va bien, pero **dos toques seguidos** (dos pulsaciones
  rápidas) se encadenan y se queda vibrando mucho rato.

Lo primero, cuando se retome: **probarlo en Chrome en el mismo móvil**, para
saber si es cosa de Brave o de Android. Luego, decidir con el usuario.

**Hecho cuando** la vibración se comporta como se espera en los navegadores
de Android que se prueben, y el SPEC dice si viene activada.

<!-- docs:historia -->
## Historia

- 2026-11-20: abierta al desactivar la vibración por defecto en F1, a la
  espera de probar en Chrome.
