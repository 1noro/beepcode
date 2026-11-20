# TODO 2 — F1, el núcleo y el modo Libre

**Estado:** cerrado · **Fase:** F1 · **SPEC:** §2–§5, §6.1, §7, §8, §11 · **ADR:** [0003](../decisions/0003-logica-morse-pura-y-datos.md) · **Código:** `src/morse/`, `src/ui/`, `src/input/`, `src/audio/`, `src/state/`, `TODO(2)`

## Qué pide

`src/morse/` completo (alphabet, tree, timing, keyer), el árbol SVG con sus
estados, el pulsador, el teclado, el audio, la vibración, la cinta histórica,
el modo Libre con Explorar, los ajustes y los temas, en los cinco idiomas.

## Hecho cuando

E2E: teclear `.-..` con el teclado y con el pulsador (táctil emulado) deja la L
en la cinta y enciende E, A, R y L, en móvil y en escritorio; cambiar de modo,
de idioma y de tema. Funciona sin conexión. Cobertura ≥ 90 % en `src/morse/`.

## Dónde está

**Cerrado el 2026-11-20**: revisado por el usuario, llevado a `main` con la
PR de la rama `feat/f1-nucleo` y publicado en Pages como **v0.1.0**, la
primera versión con tag.

- `make ci` en verde: 274 tests unitarios, 42 e2e (21 en escritorio y 21 en
  móvil emulado) y la cobertura de `src/morse/` al 100 % en líneas. El bundle
  inicial, unos 21 kB gzip, más los 40 kB de la fuente.
- **`src/morse/`**: `alphabet.ts`, `tree.ts` (el layout de SPEC §2.2 como
  datos, con su test obligatorio), `timing.ts`, `keyer.ts` (con `clock.ts`
  inyectable y `emitter.ts`).
- **La UI**: `ui/board.ts` (el SVG), `ui/tape.ts`, `ui/settingsPanel.ts`,
  `ui/appearance.ts`; `input/pointer.ts` y `input/keyboard.ts`;
  `audio/tone.ts` (tono y vibración); `state/` (almacén, ajustes con versión
  de esquema, texto de la cinta); `modes/free.ts` y el router en `main.ts`.
- **Los temas** en `styles/tokens.css`, y `tests/unit/themes.test.ts`, que lo
  lee: contraste AA en todos (AAA en alto contraste) y punto y raya
  distinguibles en las 35 combinaciones de tema y visión, simulando cada una
  con las matrices de Machado (2009) y ΔE ≥ 20.

Decisiones menores, por el camino:

- **Farnsworth**: `timing.sendTiming` ya lo calcula, pero **el ajuste "WPM
  efectivo" llega con F2** (`TODO(3)` en `state/settings.ts`), que es el
  primer modo que lo usa; en F1 no cambiaría nada.
- **Explorar** usa `timing.letterTimeline` (el código de una letra con sus
  tiempos); el `player.ts` de F2 puede partir de ahí.
- **El dibujo del árbol es más ancho que alto** (celdas de 80 × 60): con
  celdas cuadradas, las etiquetas de N y A, y de D y W, se pisaban. El layout
  de datos no cambia.
- **El selector de modo solo lista los modos que existen**: en F1, Libre. El
  e2e de "cambiar de modo" comprueba que una ruta desconocida lleva a
  `#/free`; el de cambiar de verdad, con el segundo modo (F2).
- **El selector de idioma pasa a los ajustes**, un `<dialog>` modal; con él
  abierto, el teclado no manipula.
- **La visión del color**: cada tema da sus tonos `--cvd-*` para su fondo, y
  `data-vision` los asigna a punto y raya. El error, en esos modos, va en el
  color del texto: además parpadea y su anillo es discontinuo.
- **Tras una secuencia inválida** puede seguir llegando el espacio de
  palabra, si antes se escribió una letra (cuenta desde el último símbolo).
- **`Retroceso`** sin secuencia borra el último carácter, también un espacio.
- **El camino dura lo que tardó en cerrarse la letra, y el espacio llega un
  margen de palabra adaptativo después** (SPEC §3.3 y §4.2, cambiados a
  petición del usuario): el evento `letter` del keyer dice cuánto dura el
  camino (`holdMs`) y `board.turnOffIn` lo apaga con el fundido;
  `morse/pauses.ts` aprende el margen y `keyer.rejectSpace()` lo ensancha
  cuando se borra el espacio recién puesto. El ajuste "tiempo del camino
  iluminado" desaparece; Explorar, 1,5 s fijos. El esquema de ajustes no
  cambia de versión: el campo viejo se ignora.
- **El pulsador, como una tecla mecánica, en verde y luego en rojo**
  (SPEC §3.5, a petición del usuario): lo pinta el modo desde los eventos
  `keyDown`/`keyUp` del keyer, así que vale también con `Espacio`; el cambio
  a raya, con un temporizador de `dashThresholdMs`. Teñido, la ayuda pasa a
  `--color-fg`: el `--color-muted` no llegaba a AA en Gruvbox.
- **El árbol se centra en la antena** (SPEC §2.2), como en la tarjeta: el
  lado con más columnas las junta (70) y el otro las separa hasta llegar igual
  de lejos (`ui/columns.ts`, con su test). Un primer intento rellenaba el lado
  corto, y el árbol encogía un 7 %.
- **La versión y las licencias, al pie de los ajustes** (SPEC §7, a
  petición del usuario), en "Acerca de": la pantalla principal no tiene
  sitio. La versión, como en dhtcrawler: `VERSION` de `git describe` en el
  `Makefile`, hasta `src/version.ts` por el `define` de Vite; `dev` sin él.
- **Los avisos** salen sobre el pulsador y dejan pasar el puntero: nunca
  estorban al manipular.
- **El Wake Lock** (opcional, SPEC §9) no se hace.
- **La vibración es un toque de 30 ms al pulsar, y viene desactivada**
  (SPEC §5 y §7, cambiados por el usuario): en un Pixel 7 con Brave se
  encadenaban. Refinarla, en el [TODO 9](09-vibracion.md).
- **Las pausas se adaptan al ritmo de quien manipula** (SPEC §4.2, decidido
  por el usuario): `morse/rhythm.ts` estima la unidad de sus puntos, rayas y
  silencios dentro de la letra, y el keyer escala con ella el cierre de letra
  y el espacio de palabra (`adaptive: true` en el modo Libre). Lo que el SPEC
  dejaba para el Modo Pro, solo en las pausas: el umbral de raya sigue fijo.
- **Toda la interfaz, en JetBrains Mono** servida con la app
  ([ADR 0008](../decisions/0008-tipografia-jetbrains-mono.md)).
- **El tono programa por delante del reloj de audio** (`baseLatency`, como
  mucho 30 ms) y retiene la rampa con `cancelAndHoldAtTime`: en Android sonaba
  sucio, con chasquidos.
- **La cinta tiene alto fijo**: al aparecer la primera letra crecía y el árbol
  bajaba; lo comprueba un e2e.

Sin probar de forma automática: **que suene** (el tono y sus rampas),
**la vibración** y el táctil en iOS. Se prueba con `make dev-https` en un
móvil.

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

- 2026-11-20: hecho en `feat/f1-nucleo`, revisado por el usuario en su
  Brave, y cerrado: a `main` por PR y publicado como v0.1.0.
