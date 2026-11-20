# ADR 0003 — La lógica Morse es pura, y el alfabeto y el árbol son datos

Estado: aceptada (2026-11-20, de SPEC §2, §4 y §10.2); se implementa en F1
([TODO 2](../todo/02-nucleo-y-modo-libre.md))

## Contexto

El corazón de la app es una máquina de estados que convierte pulsaciones con
duración en puntos, rayas, letras y espacios, y un árbol que decide qué es
válido. Equivocarse en un umbral o en una pausa se nota enseguida y es difícil
de ver a mano. Además, el "Modo Pro" (números, puntuación, prosignos) traerá un
árbol más grande.

## Decisión

- **`src/morse/` es lógica pura**: no importa nada del DOM, del audio, de la UI
  ni de fuera de su carpeta. ESLint lo hace cumplir (`eslint.config.js`).
- **El tiempo entra como dependencia** (un reloj inyectable), para probar el
  keyer con reloj falso.
- **El keyer emite eventos** (`keyDown`, `keyUp`, `symbol`, `letter`,
  `wordSpace`, `invalid`, `cancel`; SPEC §4.3) y no conoce a quien los escucha:
  la UI, el audio, el grabador y los modos se suscriben.
- **El alfabeto y el layout del árbol son datos**, con un test que comprueba
  que el camino de cada nodo reproduce su código y su forma (SPEC §2.2).
- **Cobertura ≥ 90 % en `src/morse/`**, que `vitest.config.ts` exige.

## Razones

- La temporización solo se puede probar bien sin DOM y con reloj falso.
- Grabar y reproducir (F4) es reinyectar eventos en el mismo keyer: solo
  funciona si el keyer no depende de nada más.
- Un árbol más grande es cambiar datos, no reescribir lógica.

## Consecuencias

- Los modos componen keyer + tablero + audio; ningún modo toca el keyer por
  dentro.
- El layout del SVG (coordenadas, formas, etiquetas) vive con el árbol, como
  datos, aunque lo pinte `src/ui/`.
