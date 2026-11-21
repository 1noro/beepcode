# TODO 3 — F2, texto a Morse

**Estado:** abierto · **Fase:** F2 · **SPEC:** §4.1, §6.5 · **ADR:** [0003](../decisions/0003-logica-morse-pura-y-datos.md) · **Código:** `src/morse/player.ts`, `src/morse/text.ts`, `src/modes/text.ts`

## Qué pide

`player.ts` (texto o código → secuencia temporizada de eventos) y el modo
Texto → Morse (`#/text`): normalizar a A–Z, saltar lo que no está en el
alfabeto, reproducir, pausar, parar y bucle, con el carácter actual resaltado,
su camino encendido y la transcripción `·−`.

## Hecho cuando

La reproducción es precisa a la velocidad configurada y con Farnsworth, con
tests del player en reloj falso.

## Dónde está

**Hecho y revisado por el usuario en la rama `feat/f2-texto-a-morse`,
commiteado y subido; falta la PR a `main` y el tag** (2026-11-21). `make check` y `make e2e` en verde:
305 tests unitarios, 56 e2e (28 en escritorio y 28 en móvil emulado) y
`player.ts` al 99 % en líneas. El bundle inicial, unos 25 kB gzip (JS, CSS
y `workbox-window`), más la fuente.

- **`src/morse/text.ts`**: `tokenize`, una ficha por carácter (letra, espacio
  o algo que se salta), en mayúsculas y sin tildes. Las letras las dice el
  árbol (`tree.nodeOf`), no un alfabeto aparte.
- **`src/morse/player.ts`**: `plan` (fichas → eventos temporizados: `letter`,
  `symbol`, `letterEnd`, `wordSpace`) y `createPlayer`, con reloj inyectable,
  reproducir, pausa, parar y bucle. Cada evento se cuenta desde el principio
  de la reproducción, así que el retraso de los temporizadores no se acumula.
  Tests en `tests/unit/morse/player.test.ts`, con reloj falso: PARIS dura 50
  unidades a cualquier WPM, y con Farnsworth las letras van a su velocidad y
  la palabra a la efectiva.
- **`src/modes/text.ts`** (`#/text`): el campo, el texto como sonará (con el
  carácter actual resaltado y lo que se salta atenuado), la transcripción
  `·−` (palabras separadas por `/`), el árbol y los controles. El tono de
  cada letra se programa entero con el reloj del audio al empezar la letra
  (SPEC §5); las luces, con los eventos.
- **El ajuste "Velocidad efectiva (Farnsworth)"**, en `state/settings.ts`
  (`effectiveWpm`): `null` es "igual que la velocidad" y la sigue; se
  guarda solo si queda por debajo. El esquema no cambia de versión: el campo
  nuevo sale por defecto.
- `tests/e2e/text.spec.ts`: el cambio de modo, la normalización, la
  reproducción con resaltado y camino, la pausa y parar, el bucle, el ajuste
  y que la página no hace scroll.

Decisiones menores, por el camino:

- **Ñ y Ç se saltan**: son letras propias, no N y C con tilde, y v1 no tiene
  su código; así lo hace también SPEC §6.2 con las listas de palabras. El
  resto de las tildes se quitan (`é` → `E`, `ï` → `I`).
- **Los blancos seguidos son una sola pausa de palabra**; al principio y al
  final, ninguna. Lo que se salta no ocupa tiempo.
- **Pausa y reanudar**: se repite la letra que se cortó; si la pausa cayó
  en una pausa entre letras, sigue la siguiente.
- **Cambiar la velocidad mientras suena** vale desde la letra siguiente.
- **El bucle** vuelve a empezar tras una pausa de palabra.
- **Al ocultar la página, se pausa**: en segundo plano los temporizadores se
  ralentizan.
- **El árbol de este modo no es interactivo** (`createBoard(tree, {
  interactive: false })`): sin Explorar, sus nodos no son botones. **La
  antena se enciende** mientras suena cada símbolo, como al manipular.
- **El texto se recuerda al cambiar de modo**, mientras la app sigue
  abierta; no se guarda entre sesiones. Como mucho 500 caracteres, como la
  cinta.
- **El player recibe texto, no código suelto** (`.- -...`): §6.5 solo pide
  un campo de texto. Una letra suelta ya la cubre `timing.letterTimeline`
  (Explorar); si F3 necesita más, `plan` admite cualquier lista de fichas.
- **Lo que se salta, atenuado y sin tachar**: una coma tachada parece un
  guion.

<!-- docs:historia -->
## Historia
