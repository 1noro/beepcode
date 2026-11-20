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

## Preguntas abiertas (SPEC §12), para el usuario antes de llegar a ellas

- **La cinta histórica** (§12.3): el tamaño de letra, si muestra el código
  bajo cada letra y qué pasa al tocar una letra.
- **Las paletas definitivas** (§12.4): las extra que propone el SPEC son
  "Brass" y "Alto contraste".
- **Si el histórico del modo Libre se guarda entre sesiones** (§12.5); el SPEC
  dice que no en v1.

<!-- docs:historia -->
## Historia
