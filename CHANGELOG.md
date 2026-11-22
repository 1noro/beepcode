# Changelog

Los cambios de beepcode por versión, para quien usa la app. Sigue
[Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y el versionado es
[semántico](https://semver.org/lang/es/).

**Cada vez que se crea un tag hay que actualizar este fichero**, antes de
crearlo: lo que haya en "Sin publicar" pasa a una sección nueva con la versión
y la fecha, y el commit del changelog es el que se etiqueta. Ver "Flujo de
git" en `AGENTS.md`.

Los apartados: **Añadido** (funcionalidad nueva), **Cambiado** (comportamiento
que ya existía), **Corregido** (bugs) y **Documentación**.

## Sin publicar

### Cambiado

- **Las ayudas del modo Libre, como las del modo Texto → Morse**: debajo de
  la cinta, alineadas a la izquierda y en una sola línea cada una, en los
  cinco idiomas. Antes iban centradas entre el árbol y el pulsador, y la de
  las teclas partía línea.
- **El árbol, arriba, en los dos modos**, empezando en la punta de la
  antena; el texto, justo debajo, y los controles, abajo. En horizontal, el
  árbol a la izquierda. La barra superior ya no tiene línea.
- **El cursor del modo Texto → Morse, un bloque** como el de la cinta del
  modo Libre: al final del texto, un bloque; en medio, el carácter
  invertido. El de la cinta toma sus mismas proporciones.
- **Los botones del modo Texto → Morse, con el cuerpo del pulsador del modo
  Libre**: Reproducir grande y Parar y Bucle al lado.
- **Las proporciones, según la pantalla**: el árbol, el texto y los
  controles van juntos, centrados en la altura, y lo que sobra queda arriba
  y abajo, no entre el texto y los botones. Con ratón, el pulsador y los
  botones son más bajos y, en una pantalla alta, el árbol crece; en el
  móvil, también son más bajos que antes.
- **El texto, del mismo tamaño en los dos modos**: la cinta del modo Libre
  ya no es el doble de grande que el texto del modo Texto → Morse.

## 0.3.0 — 2026-11-21

### Añadido

- **Un botón de espacio** (␣) junto al pulsador, en el modo Libre: termina
  la palabra cuando quieras, y cierra antes la letra en curso. Con el
  teclado, `Enter` sin letra en curso hace lo mismo.

### Cambiado

- **Los espacios entre palabras, a mano por defecto** en el modo Libre: ya
  no llega uno solo mientras piensas la letra siguiente. Los automáticos,
  por pausa, siguen en los ajustes ("Espacios entre palabras automáticos").
- **Los ajustes, agrupados por a qué afectan**: lo de todos los modos
  (aspecto; sonido y velocidad) y una sección por modo con lo suyo.

### Corregido

- **Los primeros pitidos** al abrir la app, o tras un rato sin tocarla, ya
  no se pierden ni suenan más largos de lo pulsado. El audio arranca con
  cualquier toque (también el primero en el móvil), no se duerme mientras la
  app está a la vista, y lo que se pulsa mientras arranca suena después con
  su duración exacta.

## 0.2.0 — 2026-11-21

### Añadido

- **El modo Texto → Morse** (`#/text`): escribe un texto y óyelo en Morse,
  con reproducir, pausa, parar y bucle. Se escribe sobre el propio texto,
  que se pasa a mayúsculas sin tildes; lo que no está en el alfabeto
  (números, puntuación, Ñ, Ç) se ve atenuado y se salta. Mientras suena, se resalta el carácter, se enciende su camino en el
  árbol y se ve la transcripción `·−` entera. Un ✕ en el campo lo vacía, y
  un contador dice cuánto queda de los 200 caracteres que admite. Sin
  texto, donde irá el código se ve "beepcode" en Morse.
- **La velocidad efectiva (Farnsworth)** en los ajustes: las letras suenan a
  la velocidad elegida y las pausas entre ellas se alargan hasta la efectiva.

### Cambiado

- **"Visión del color"** ya no ofrece "Normal", sino **"Por defecto"**: no
  hay una visión normal y otras que no lo son.

## 0.1.0 — 2026-11-20

### Añadido

- **Una página "hola" instalable como PWA**, que funciona sin conexión y avisa
  cuando hay una versión nueva ("Nueva versión disponible · Recargar").
- **Cinco idiomas**: inglés, castellano, gallego, catalán y euskera, según el
  navegador o con el selector. Las tres últimas, pendientes de revisión por un
  nativo.
- **Tema claro u oscuro**, según el sistema.
- Un icono provisional, hasta que esté el logo.
- **El modo Libre**: el árbol Morse, que se ilumina siguiendo lo que tecleas
  (verde el punto, rojo la raya; círculo y rectángulo, para no depender del
  color), con un pulsador en pantalla o con el teclado (`Espacio`, `.`, `-`,
  `Enter`, `Retroceso`, `Escape`), tono mientras se pulsa y, si se
  activa, un toque de vibración al pulsar, en Android. Las pausas que cierran
  la letra y separan las palabras se adaptan a tu ritmo, como el oído de un
  telegrafista.
- **La cinta**: las letras escritas, con espacios entre palabras, la
  secuencia en curso en `·−`, y borrar, borrar la última y copiar.
- **Explorar**: tocar una letra del árbol enseña su camino y suena su código.
- **Los ajustes**, que se recuerdan: idioma, tema (sistema, claro, oscuro,
  Gruvbox oscuro y claro, alto contraste), visión del color (protanopia,
  deuteranopia, tritanopia, acromatopsia), colores del punto y la raya,
  velocidad, tolerancia de pausa, umbral de raya, tono, volumen, silencio
  y vibración.
- **El camino iluminado dice cuándo seguir**: tras cada letra se apaga con un
  fundido rápido, y después aún hay margen para la letra siguiente de la
  misma palabra. Ese margen aprende cuánto sueles pensar entre letras, y
  crece si borras un espacio que llegó antes de tiempo.
- **El árbol se centra en la antena**, de donde parte la luz.
- **Un pulsador que da ganas de pulsar**: se hunde como una tecla de verdad,
  se pone verde al pulsar y roja cuando ya es una raya, y un degradado que
  lo barre marca cuándo.
- **La versión y las licencias**, al pie de los ajustes, con enlaces a las
  licencias y al código fuente.

### Cambiado

- La página "hola" da paso al modo Libre, y el selector de idioma pasa a los
  ajustes.
- Toda la interfaz, en una sola tipografía monoespaciada (JetBrains Mono),
  servida con la app: la misma letra en todos los dispositivos.

### Documentación

- `SPEC.md`, la especificación; `AGENTS.md`, las normas para personas y
  agentes de IA; los ADR, `docs/estado.md` y una ficha por fase.
