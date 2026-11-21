# TODO 3 — F2, texto a Morse

**Estado:** cerrado · **Fase:** F2 · **SPEC:** §4.1, §6.5 · **ADR:** [0003](../decisions/0003-logica-morse-pura-y-datos.md) · **Código:** `src/morse/player.ts`, `src/morse/text.ts`, `src/modes/text.ts`

## Qué pide

`player.ts` (texto o código → secuencia temporizada de eventos) y el modo
Texto → Morse (`#/text`): normalizar a A–Z, saltar lo que no está en el
alfabeto, reproducir, pausar, parar y bucle, con el carácter actual resaltado,
su camino encendido y la transcripción `·−`.

## Hecho cuando

La reproducción es precisa a la velocidad configurada y con Farnsworth, con
tests del player en reloj falso.

## Dónde está

**Cerrado: publicado como v0.2.0** (2026-11-21), desde la rama
`feat/f2-texto-a-morse` con `/desplegar`. `make check` y `make e2e` en verde:
307 tests unitarios, 70 e2e (35 en escritorio y 35 en móvil emulado) y
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
- **Un botón ✕ en la esquina del campo lo vacía** (a petición del usuario):
  para lo que suena y devuelve el foco al campo; con el campo vacío, oculto.
- **El texto se recuerda al cambiar de modo**, mientras la app sigue
  abierta; no se guarda entre sesiones.
- **Como mucho 200 caracteres, con un contador siempre visible** (`37 / 200`,
  a petición del usuario): unos 3 minutos a 12 PPM, que basta para
  practicar y cabe bajo el campo. Al principio eran 500, como la cinta, y no
  se veía.
- **El player recibe texto, no código suelto** (`.- -...`): §6.5 solo pide
  un campo de texto. Una letra suelta ya la cubre `timing.letterTimeline`
  (Explorar); si F3 necesita más, `plan` admite cualquier lista de fichas.
- **El árbol no se mueve al escribir** (a petición del usuario): el texto
  como sonará y la transcripción tienen dos líneas fijas cada uno, con
  scroll propio hasta lo que suena, y la ayuda de lo que se salta guarda su
  sitio aunque no se vea. Antes la zona crecía con el texto, y el árbol, que
  ocupa lo que queda, se encogía y se movía. Un e2e lo comprueba.
- **Lo que se salta, atenuado y sin tachar**: una coma tachada parece un
  guion.
- **Se escribe sobre el texto como sonará** (a petición del usuario): había
  dos textos iguales, el del campo y el normalizado, y el campo se comía
  sitio. Ahora el campo es transparente y está encima del texto, letra sobre
  letra (la fuente es monoespaciada): el campo pone el cursor, la selección
  y el teclado; lo de debajo, lo que se ve. No con `contenteditable`, que
  obliga a rehacer los spans sin perder el cursor y con los teclados de
  Android da guerra. Para que coincidan: los saltos de línea pasan a
  espacios (abajo todo blanco es un espacio), y lo que en mayúsculas serían
  dos letras (`ß` → `SS`) se queda como está (`text.normalizeChar`).
- **Sin marco alrededor del texto** (a petición del usuario): el texto es el
  campo. Sin texto, lo que invita a escribir es un cursor que parpadea donde
  saldrá el real y, debajo, "Escribe un texto para oírlo en Morse"; con el
  foco, el falso deja sitio al real. En un ordenador, teclear sin nada
  enfocado escribe en el campo, sin pulsarlo antes. No se enfoca solo al
  entrar: en el móvil sacaría el teclado, y con el teclado en el selector de
  modo, cada flecha cambia de modo y le robaría el foco.
- **El texto y su código empiezan centrados** (a petición del usuario): la
  transcripción mide lo que su contenido y se centra hasta llenar el ancho;
  el texto, que no puede encoger porque es un campo, se centra mientras cabe
  en una línea y, si no, va desde la izquierda. **Los dos, en la misma
  columna**: el texto deja a cada lado el sitio del ✕ (`--side`), y el
  código, el mismo. **Y la misma barra de desplazamiento**, fina y con los
  colores del tema, con su hueco guardado a los dos lados en las dos cajas
  (`scrollbar-gutter: stable both-edges`): así el campo y el texto de debajo
  miden igual aunque la barra aparezca, el centro sigue en el centro y el
  texto empieza donde el código. Al principio el campo no tenía barra, para
  no descuadrarse, y el código sí. El pie (la ayuda y el contador) no: en el móvil, la
  ayuda pasaría a tres líneas y, como guarda su sitio, encogería el árbol.
- **Sin texto, "beepcode" en Morse donde irá el código** (a petición del
  usuario): puntos y rayas con la forma y los colores del árbol, por los que
  pasa despacio una onda de luz, como si se transmitiera. El nombre sale de
  `app.name` y su código, del árbol; es decorativo (`aria-hidden`), y con
  movimiento reducido se queda quieto.

<!-- docs:historia -->
## Historia
