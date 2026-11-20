# TODO 2 — F1, el núcleo y el modo Libre

**Estado:** abierto · **Fase:** F1 · **SPEC:** §2–§5, §6.1, §7, §8, §11 · **ADR:** [0003](../decisions/0003-logica-morse-pura-y-datos.md) · **Código:** `src/morse/`, `src/ui/`, `src/input/`, `src/audio/`, `src/state/`, `TODO(2)`

## Qué pide

`src/morse/` completo (alphabet, tree, timing, keyer), el árbol SVG con sus
estados, el pulsador, el teclado, el audio, la vibración, la cinta histórica,
el modo Libre con Explorar, los ajustes y los temas, en los cinco idiomas.

## Hecho cuando

E2E: teclear `.-..` con el teclado y con el pulsador (táctil emulado) deja la L
en la cinta y enciende E, A, R y L, en móvil y en escritorio; cambiar de modo,
de idioma y de tema. Funciona sin conexión. Cobertura ≥ 90 % en `src/morse/`.

## Dónde está

Sin empezar. Los `TODO(2)` del código marcan dónde se engancha: el router en
`src/main.ts` y los temas en `src/styles/tokens.css`.

Un orden razonable, un commit por paso: `alphabet` y `tree` con el test del
layout (SPEC §2.2) → `timing` → `keyer` con reloj falso → el tablero SVG →
audio → pulsador y teclado → cinta → modo Libre y Explorar → ajustes y temas →
los e2e.

## Lo decidido de SPEC §12 (el usuario, 2026-11-20)

- **La cinta** (§12.3, SPEC §3.4): **solo texto corrido**, con una letra
  legible en cualquier pantalla (un tamaño que escale con el ancho, con
  `clamp()`, y nunca por debajo de lo cómodo en un móvil). **Sin el código
  bajo cada letra y sin acción al tocar una letra.** Debajo, aparte, sigue la
  secuencia en curso en `·`/`−` (SPEC §3.4).
- **Las paletas extra** (§12.4, SPEC §7): **Gruvbox oscuro, Gruvbox claro y
  Alto contraste** ("Brass" no). Las Gruvbox, con punto y raya en su verde y
  su rojo, y contraste AA (SPEC §11), ajustando el tono si hace falta; Alto
  contraste, a 7:1 (AAA).
- **La visión del color** (§12.4, SPEC §7): un ajuste **aparte del tema y
  combinable con todos**, para protanopia, deuteranopia, tritanopia y
  acromatopsia. Cambia solo los tokens que dependen del matiz (`--color-dot`,
  `--color-dash`, `--color-accent`, `--color-error`), con un atributo en
  `<html>` (p. ej. `data-vision="deuteranopia"`) junto a `data-theme`. Se eligió
  así, y no un tema por tipo, para no multiplicar temas por cinco. Los colores,
  de partida, de la paleta de Okabe-Ito (azul y naranja para rojo-verde). **Un
  test unitario simula cada tipo** (las matrices de Machado et al., 2009) y
  exige que punto y raya se distingan en cada combinación de tema y visión;
  la simulación es lógica pura, sin DOM.
- **El histórico del modo Libre no se guarda entre sesiones** (§12.5).

<!-- docs:historia -->
## Historia
