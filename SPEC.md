# SPEC — beepcode

> Especificación funcional y técnica de una SPA para aprender y practicar código Morse, inspirada en una tarjeta "fidget" física (Morse Code Trainer Card de innoelement) que muestra el árbol de decodificación Morse y lo ilumina con LEDs a medida que se teclea con un único pulsador.
>
> Este documento es la fuente de verdad del proyecto. Los identificadores de código, nombres de ficheros y commits van en inglés; la documentación puede ir en español.

---

## 1. Objetivo

Recrear en web, con una interfaz flat y simple, la experiencia de la tarjeta física:

- Un **único pulsador** (manipulador recto): la duración de la pulsación decide si es punto o raya.
- Un **árbol Morse** cuyos nodos se iluminan siguiendo el camino de lo tecleado: **verde = punto**, **rojo = raya**.
- **Sonido** (tono) mientras se pulsa.

Y aprovechar que es web para añadir lo que la tarjeta no tiene: histórico de letras escritas, modos de aprendizaje, escucha, grabación y conversión de texto a Morse.

### Requisitos transversales

- Funciona igual de bien con **pantalla táctil (móvil/tablet)**, **ratón** y **teclado (PC)**.
- **PWA instalable y usable sin conexión** desde la v1.
- **i18n**: inglés por defecto; soporte para castellano, gallego, catalán y euskera.
- **Tema**: seguir el sistema (claro/oscuro) o elegir tema manualmente; colores configurables.
- **Sin backend**. Todo el estado se guarda en el navegador.
- Publicación en **GitHub Pages**; pruebas en local servidas con **Docker**.
- **Requisitos del equipo de desarrollo: solo Docker (con Compose v2) y `make`.** No se asume Node, npm ni ninguna otra herramienta en el host: todo (instalar dependencias, desarrollo, lint, tests, build, e2e, servir) se ejecuta dentro de contenedores y se lanza con `make` (§10.3).

### Fuera de alcance en v1 (ver §13, Roadmap)

- Estadísticas de progreso (se dejan para el final).
- "Modo Pro": números, signos de puntuación, prosignos, caracteres nacionales (Ñ, Ç…).
- Manipulador iámbico (dos palas), temporización adaptativa.

---

## 2. Alfabeto y árbol

### 2.1 Alfabeto (v1)

Solo las 26 letras A–Z del Morse internacional, como en la tarjeta original.

| Letra | Código | Letra | Código | Letra | Código |
|---|---|---|---|---|---|
| A | `.-` | J | `.---` | S | `...` |
| B | `-...` | K | `-.-` | T | `-` |
| C | `-.-.` | L | `.-..` | U | `..-` |
| D | `-..` | M | `--` | V | `...-` |
| E | `.` | N | `-.` | W | `.--` |
| F | `..-.` | O | `---` | X | `-..-` |
| G | `--.` | P | `.--.` | Y | `-.--` |
| H | `....` | Q | `--.-` | Z | `--..` |
| I | `..` | R | `.-.` | | |

El árbol es binario: desde la raíz, un punto lleva a un hijo y una raya al otro. Los nodos sin letra en v1 (p. ej. `..--`, `---.`) **no existen**; teclear hacia ellos es una secuencia inválida (§4.4).

> Diseñar las estructuras de datos para que el alfabeto y el layout sean **datos**, no código, de modo que el futuro "Modo Pro" pueda cargar un árbol más grande sin reescribir la lógica.

### 2.2 Layout del árbol (inspirado en el original)

La disposición replica la topología de la tarjeta. Coordenadas en una rejilla lógica (`x` columna, `y` fila; origen arriba a la izquierda). La raíz (icono de antena) está entre T y E.

- Lado **punto** (derecha, a partir de E): en general punto = seguir a la derecha, raya = bajar.
- Lado **raya** (izquierda, a partir de T): en general raya = seguir a la izquierda, punto = bajar.
- Excepción de layout: F (`..-.`) cuelga debajo de U porque a la derecha está la columna de V.

| Nodo | Código | Padre | x | y | Forma | Etiqueta |
|---|---|---|---|---|---|---|
| ROOT | — | — | 2.5 | -0.6 | antena | — |
| T | `-` | ROOT | 2 | 0 | rect H | arriba |
| M | `--` | T | 1 | 0 | rect H | arriba |
| O | `---` | M | 0 | 0 | rect H | arriba |
| G | `--.` | M | 1 | 1 | círculo | derecha |
| Q | `--.-` | G | 0 | 1 | rect H | izquierda |
| Z | `--..` | G | 1 | 2 | círculo | derecha |
| N | `-.` | T | 2 | 3 | círculo | derecha |
| K | `-.-` | N | 1 | 3 | rect H | arriba |
| Y | `-.--` | K | 0 | 3 | rect H | arriba |
| C | `-.-.` | K | 1 | 4 | círculo | derecha |
| D | `-..` | N | 2 | 5 | círculo | derecha |
| X | `-..-` | D | 1 | 5 | rect H | izquierda |
| B | `-...` | D | 2 | 6 | círculo | izquierda |
| E | `.` | ROOT | 3 | 0 | círculo | arriba |
| I | `..` | E | 4 | 0 | círculo | arriba |
| S | `...` | I | 5 | 0 | círculo | arriba |
| H | `....` | S | 6 | 0 | círculo | arriba |
| U | `..-` | I | 4 | 1 | rect V | izquierda |
| F | `..-.` | U | 4 | 2 | círculo | derecha |
| V | `...-` | S | 5 | 1 | rect V | derecha |
| A | `.-` | E | 3 | 3 | rect V | izquierda |
| R | `.-.` | A | 4 | 3 | círculo | abajo |
| L | `.-..` | R | 5 | 3 | círculo | derecha |
| W | `.--` | A | 3 | 5 | rect V | izquierda |
| P | `.--.` | W | 4 | 5 | círculo | derecha |
| J | `.---` | W | 3 | 6 | rect V | derecha |

Reglas de dibujo:

- **Círculo** = el último símbolo del nodo es punto. **Rectángulo** (redondeado) = raya. La orientación del rectángulo (H/V) sigue la dirección de la arista que llega a él.
- Las aristas son líneas rectas ortogonales entre padre e hijo (ROOT→T y ROOT→E pueden ser un pequeño "codo" desde la antena).
- La forma distingue punto y raya además del color → accesible para daltónicos.
- Escalado: SVG con `viewBox`; ocupa el ancho disponible manteniendo la proporción.

Test obligatorio: para cada nodo, el camino ROOT→nodo del layout reproduce exactamente su código, y cada arista de punto/raya llega a un nodo de la forma correcta.

---

## 3. Interfaz

### 3.1 Principios

- Flat, minimalista, mucho contraste, sin texturas. Inspirada en la tarjeta, sin imitarla.
- Una sola pantalla por modo; nada de scroll durante el tecleo.
- Mobile-first, vertical. Debe funcionar también en horizontal y en escritorio.

### 3.2 Estructura de pantalla (móvil, vertical)

```
┌───────────────────────────────┐
│ [Modo ▾]          [⚙] [🔊]    │  barra superior
├───────────────────────────────┤
│ HELLO WOR█                    │  cinta histórica (§3.4)
│ ·−··                          │  secuencia en curso
├───────────────────────────────┤
│                               │
│        ÁRBOL MORSE (SVG)      │
│                               │
├───────────────────────────────┤
│                               │
│        [  PULSADOR  ]         │  zona del pulgar
│                               │
└───────────────────────────────┘
```

- Respetar `env(safe-area-inset-*)` (notch, barra de gestos).
- En escritorio u horizontal: el árbol centrado y el pulsador debajo o al lado; mostrar una pista de teclas ("Espacio = manipulador · `.` / `-` · Enter · Retroceso").

### 3.3 Estados visuales de los nodos

| Estado | Aspecto |
|---|---|
| apagado | contorno tenue y etiqueta en gris |
| encendido punto | relleno verde con un ligero brillo |
| encendido raya | relleno rojo con un ligero brillo |
| letra final | además, anillo/realce y etiqueta resaltada |
| inválido | el último nodo válido parpadea en un color de error y la secuencia se descarta |

- Las aristas del camino también se iluminan.
- La antena (raíz) se "enciende" mientras el pulsador está apretado, como indicador de transmisión.
- **Tras cerrar la letra**, el camino se mantiene encendido `pathHoldMs` (1200 ms por defecto, como el original, algo más de 1 s) y después se apaga con un fundido. Si empieza una nueva pulsación antes, se apaga al instante.
- Respetar `prefers-reduced-motion`: sin brillos animados ni fundidos.

### 3.4 Cinta histórica

- Línea horizontal encima del árbol donde se **apilan las letras** escritas. La más reciente queda a la derecha y la cinta se desplaza sola.
- Los espacios entre palabras se muestran como un hueco visible.
- Debajo, la secuencia en curso en notación `·` / `−`.
- Acciones: borrar todo, borrar la última letra y copiar al portapapeles.
- Se guarda como máximo un número razonable de caracteres (p. ej. 500); no se persiste entre sesiones en v1.
- Anuncio accesible: `aria-live="polite"` con la letra decodificada.

> Diseño de la cinta (decidido el 2026-11-20, §12.3): **solo texto corrido**, con una letra legible en cualquier pantalla; sin el código bajo cada letra y sin acción al tocarla.

### 3.5 Pulsador (móvil y ratón)

- Botón grande, a todo el ancho y con al menos 96 px de alto, en la zona inferior.
- Reacciona en `pointerdown`/`pointerup` (nunca `click`) para minimizar la latencia.
- `touch-action: none`, `user-select: none`, `-webkit-touch-callout: none`, `contextmenu` cancelado, sin zoom por doble toque y `overscroll-behavior: none` (evita el pull-to-refresh).
- Usa `setPointerCapture` para que soltar fuera del botón cuente como soltar.
- Solo cuenta un puntero activo; los demás toques se ignoran.
- Estado visual "pulsado" inmediato.

### 3.6 Teclado (PC)

| Tecla | Acción |
|---|---|
| `Espacio` | Manipulador recto: keydown = pulsar y keyup = soltar. Se ignora `event.repeat`. |
| `.` | Introduce un punto directamente (sin depender de la duración) |
| `-` (incluido el del teclado numérico) | Introduce una raya directamente |
| `Enter` | Cierra la letra en curso inmediatamente |
| `Backspace` | Si hay secuencia en curso, la cancela; si no, borra la última letra del histórico |
| `Escape` | Cancela la secuencia en curso |
| `A`–`Z` | En el modo Escuchar: responder. En los demás modos no hacen nada. |

- Los atajos se capturan a nivel de `window`, salvo cuando el foco está en un campo de texto (modo Texto→Morse, ajustes).
- `Espacio` debe hacer `preventDefault` para que no haga scroll ni active el botón que tenga el foco.
- Con `.`/`-`, la letra se cierra igual por pausa (§4.2) o con `Enter`.
- Al cambiar de pestaña o perder el foco (`blur`/`visibilitychange`) con la tecla pulsada, se fuerza el "soltar" para que el tono no se quede sonando.

---

## 4. Lógica de manipulación (keyer)

### 4.1 Temporización (estándar PARIS)

- `unitMs = 1200 / wpm`
- Duraciones estándar: punto = 1 u, raya = 3 u, pausa entre símbolos = 1 u, entre letras = 3 u y entre palabras = 7 u.

### 4.2 Clasificación de la entrada (manipulador recto)

Máquina de estados pura, sin dependencias del DOM y testeable con reloj falso:

```
IDLE ──press──▶ PRESSED ──release──▶ GAP ──(letterGap)──▶ commit letra ──▶ IDLE_AFTER_LETTER
                   ▲                   │                                       │
                   └──────press────────┘◀──────────────press───────────────────┘
IDLE_AFTER_LETTER ──(wordGap)──▶ inserta espacio en el histórico ──▶ IDLE
```

- Duración de la pulsación `d`:
  - `d < debounceMs` (15 ms): se ignora.
  - `d < dashThreshold`: **punto**; si no, **raya**. Por defecto `dashThreshold = 2 u`.
- Tras soltar:
  - Si pasa `letterGap = 3 u × gapTolerance` sin nueva pulsación, **se cierra la letra**.
  - Si pasa `wordGap = 7 u × gapTolerance` desde el último símbolo, se inserta un **espacio de palabra**. Solo uno; nunca al principio ni duplicado.
- `gapTolerance` viene a 1.5 por defecto, para principiantes.
- Ejemplo a 12 WPM: u = 100 ms, umbral de raya 200 ms, cierre de letra 450 ms y espacio de palabra 1050 ms.
- La entrada directa `.`/`-` inyecta símbolos en la misma máquina y usa los mismos temporizadores de pausa.

### 4.3 Eventos que emite el keyer

`keyDown`, `keyUp`, `symbol(dot|dash, sequence, node)`, `letter(char, sequence)`, `wordSpace`, `invalid(sequence, lastValidNode)` y `cancel`.

La UI, el audio, el grabador y los modos se suscriben a estos eventos; el keyer no conoce a ninguno.

### 4.4 Secuencias inválidas

Si un símbolo lleva a un nodo inexistente o se superan 4 símbolos en v1:

- Se emite `invalid` y la UI marca el error en el último nodo válido (§3.3).
- No se añade nada al histórico.
- En el modo Aprender cuenta como fallo.

---

## 5. Audio y háptica

- **Web Audio API**: oscilador senoidal y `GainNode` con rampas de 5 ms en el ataque y la caída para evitar clics.
- El tono arranca en `keyDown` y para en `keyUp` (sidetone en tiempo real). En reproducción se programa con `AudioContext.currentTime` para que la temporización sea precisa.
- Ajustes: frecuencia (400–1000 Hz, por defecto 600), volumen y silencio.
- El `AudioContext` se crea o reanuda en el primer gesto del usuario (requisito de iOS/Safari).
- **Vibración** opcional con `navigator.vibrate`, solo donde exista (Android/Chrome). En iOS no está disponible y se oculta la opción.

---

## 6. Modos

Selector de modo en la barra superior. Rutas por hash (`#/free`, `#/learn`, `#/listen`, `#/record`, `#/text`) para que funcione en GitHub Pages sin trucos de 404.

### 6.1 Libre (`#/free`) — modo por defecto

- Teclear con el pulsador o el teclado; el camino se ilumina y las letras se apilan en la cinta (§3.4).
- **Explorar**: tocar o hacer clic sobre cualquier letra del árbol ilumina su camino paso a paso y reproduce su código a la velocidad configurada. No escribe en el histórico.

### 6.2 Aprender (`#/learn`)

- La app muestra un **objetivo** (letra o palabra) y el usuario lo teclea.
- Acierto: realce de éxito y paso al siguiente objetivo. Fallo o secuencia inválida: se anima el camino correcto con sonido y se repite el objetivo (configurable).
- Opciones:
  - **Contenido**: letras o palabras.
  - **Conjunto de letras**:
    - orden Koch (K M R S U A P T L O W I N J E F Y V G Q Z H B C D X), con un número configurable de letras activas;
    - orden por profundidad del árbol (E T I A N M S U R W D K G O H V F L P J B X C Y Z Q);
    - todas en orden aleatorio;
    - selección personalizada.
  - **Ayuda**:
    - 0: sin ayuda;
    - 1: mostrar el código `·−`;
    - 2: previsualizar el camino en el árbol (atenuado).
- Palabras: listas cortas de palabras comunes por idioma, normalizadas a A–Z (sin tildes). Se descartan las que contienen Ñ o Ç.
- Contador de la sesión (aciertos, fallos y racha) solo en memoria. Las estadísticas persistentes llegan en la fase de estadísticas.

### 6.3 Escuchar (`#/listen`)

- La app reproduce una letra (o palabra) y el usuario la identifica.
- Formas de responder: tocar o hacer clic en la letra del árbol, o pulsar `A`–`Z` en el teclado.
- Opciones:
  - **con luces** (el camino se ilumina mientras suena) o **solo sonido**;
  - mismo selector de conjunto de letras que en Aprender;
  - **velocidad Farnsworth**: WPM del carácter y WPM efectivo por separado.
- Botón "repetir". Tras responder se muestra la solución con su camino.

### 6.4 Grabar y reproducir (`#/record`)

- **Grabar**: captura las pulsaciones reales (`press`/`release` con marca de tiempo relativa) mientras se teclea. Por debajo funciona igual que el modo Libre.
- **Reproducir**: reinyecta los eventos en un keyer con su temporización original, de modo que el sonido, las luces y la decodificación son idénticos a los de la grabación.
- Cada grabación se guarda en `localStorage` como `{ id, name, createdAt, wpm, events[], decodedText }`, con un límite de unas 50.
- Lista de grabaciones: renombrar, borrar y reproducir.
- Exportar e importar en JSON queda opcional para una fase posterior.

### 6.5 Texto → Morse (`#/text`)

- Campo de texto. Se normaliza a mayúsculas sin tildes; los caracteres fuera del alfabeto se muestran atenuados y se saltan, y los espacios generan una pausa de palabra.
- Botones reproducir, pausa, parar y bucle.
- Durante la reproducción se resalta el carácter actual, se ilumina su camino y suena el tono a la velocidad configurada.
- Se muestra la transcripción `·−` completa.

---

## 7. Ajustes

Se abren desde el panel ⚙ y se persisten en `localStorage` (con versión de esquema para migrar).

| Ajuste | Por defecto | Rango |
|---|---|---|
| Idioma | el del navegador si está soportado; si no, `en` | en, es, gl, ca, eu |
| Tema | sistema | sistema / claro / oscuro / Gruvbox oscuro / Gruvbox claro / alto contraste |
| Visión del color | normal | normal / protanopia / deuteranopia / tritanopia / acromatopsia |
| Color de punto / raya | verde / rojo | selector de color |
| Velocidad (WPM) | 12 | 5–40 |
| WPM efectivo (Farnsworth) | = WPM | 5–WPM |
| Tolerancia de pausa | 1.5 | 1.0–3.0 |
| Umbral de raya | 2 u | 1.5–2.5 u |
| Tiempo de camino iluminado | 1200 ms | 0–3000 ms |
| Frecuencia del tono | 600 Hz | 400–1000 |
| Volumen / silencio | 70 % / no | — |
| Vibración | sí (si está soportada) | — |

- **Temas**: todos los colores son variables CSS (`--color-bg`, `--color-fg`, `--color-dot`, `--color-dash`, `--color-accent`, …). "Sistema" sigue `prefers-color-scheme` en vivo. Paletas extra: **Gruvbox oscuro**, **Gruvbox claro** y **Alto contraste** (contraste AAA, 7:1) (decidido el 2026-11-20, §12.4).
- **Visión del color** (decidido el 2026-11-20, §12.4): un ajuste aparte del tema, que se combina con cualquiera de ellos y cambia solo los colores que dependen del matiz (punto, raya, acento y error) por unos que se distinguen con ese tipo de daltonismo:
  - **protanopia** y **deuteranopia** (rojo-verde): punto y raya en el eje azul–naranja;
  - **tritanopia** (azul-amarillo): punto y raya en el eje rojo–turquesa;
  - **acromatopsia** (sin color): punto y raya por luminosidad, uno claro y otro oscuro respecto al fondo.

  La forma (círculo / rectángulo, §2.2) ya distingue punto y raya sin color; esto lo refuerza. El selector de color de punto / raya, si se usa, manda sobre los dos. Un test comprueba, simulando cada tipo de daltonismo, que punto y raya se distinguen en todos los temas.
- Botón "Restablecer valores por defecto".

---

## 8. Internacionalización

- Idiomas: **en** (por defecto y fallback), **es**, **gl**, **ca**, **eu**.
- Diccionarios JSON por idioma, con claves planas o con namespaces y tipado de claves en TypeScript a partir de `en.json`. Un test comprueba que todos los idiomas tienen todas las claves.
- Se detecta `navigator.languages` y se puede cambiar manualmente. Hay que actualizar `<html lang>`.
- Las listas de palabras del modo Aprender también van por idioma.
- Las traducciones gl, ca y eu las generará la IA: se marcan como **pendientes de revisión por un hablante nativo**.

---

## 9. PWA

- `vite-plugin-pwa` (Workbox):
  - manifest con nombre, iconos (192, 512 y maskable), `display: standalone`, `orientation: any` y colores de tema;
  - precaché de todos los assets para funcionar sin conexión.
- Actualización: aviso no intrusivo de "Nueva versión disponible · Recargar".
- El service worker requiere contexto seguro: funciona en `localhost` y en GitHub Pages (HTTPS). Ver la nota de pruebas en móvil (§10.3).
- Opcional: Screen Wake Lock API durante la práctica, desactivable.

---

## 10. Stack, estructura y entornos

### 10.1 Stack

- **Vite + TypeScript** (modo `strict`), **sin framework**: DOM y SVG a mano con componentes pequeños.
- Tests unitarios con **Vitest** (más `@vitest/coverage-v8`).
- E2E de humo con **Playwright**, incluida la emulación móvil (táctil).
- **ESLint** y **Prettier**.
- Node **solo dentro de Docker**: versión LTS actual, fijada en un único sitio (`ARG NODE_VERSION` del `Dockerfile`) y reflejada en el campo `engines` de `package.json`. No hay `.nvmrc` porque no se usa Node en el host.
- `package-lock.json` versionado; las instalaciones usan siempre `npm ci`.

### 10.2 Estructura propuesta

```
/
├─ SPEC.md, AGENTS.md, CLAUDE.md, README.md, CHANGELOG.md, LICENSE.*.txt
├─ index.html
├─ vite.config.ts
├─ public/              iconos y favicon
├─ src/
│  ├─ main.ts           arranque y router por hash
│  ├─ morse/            LÓGICA PURA (sin DOM)
│  │  ├─ alphabet.ts    tabla letra↔código (datos)
│  │  ├─ tree.ts        construcción del árbol y layout (datos de §2.2)
│  │  ├─ timing.ts      unidades, umbrales, Farnsworth
│  │  ├─ keyer.ts       máquina de estados (§4)
│  │  ├─ player.ts      texto/código → secuencia temporizada de eventos
│  │  └─ recorder.ts    grabación y reproducción de eventos
│  ├─ audio/tone.ts     Web Audio + vibración
│  ├─ input/            pointer.ts (pulsador), keyboard.ts
│  ├─ ui/               board.ts (SVG), tape.ts, keyButton.ts, settingsPanel.ts, modeSelector.ts
│  ├─ modes/            free.ts, learn.ts, listen.ts, record.ts, text.ts
│  ├─ state/            store.ts (observable simple), settings.ts (persistencia + migraciones)
│  ├─ i18n/             index.ts, locales/{en,es,gl,ca,eu}.json, words/{en,es,gl,ca,eu}.json
│  └─ styles/           tokens.css (variables de tema), base.css
├─ tests/
│  ├─ unit/             tests de morse/, settings, i18n
│  └─ e2e/              smoke en Playwright (escritorio + móvil)
├─ Makefile             ÚNICO punto de entrada para todas las tareas (§10.5)
├─ Dockerfile, compose.yaml, nginx.conf, .dockerignore
└─ .github/workflows/   deploy.yml (make ci + Pages, solo desde main)
```

Regla de arquitectura: `src/morse/` no importa nada del DOM ni del audio. Los modos componen keyer + board + audio a través de los eventos del keyer.

### 10.3 Docker: todo el entorno en contenedores

En el host no se ejecuta nunca `node`, `npm` ni `npx`. El código se monta como volumen en los contenedores, y los ficheros que estos generan (`node_modules/`, `dist/`, `package-lock.json`, informes) se crean con el **UID/GID del usuario del host**, nunca como root.

**`Dockerfile`** multi-stage, con `ARG NODE_VERSION`:

| Stage | Base | Uso |
|---|---|---|
| `toolchain` | `node:${NODE_VERSION}-bookworm-slim` | Imagen de herramientas para install, dev, lint, test y build. Se usa glibc (no alpine) para que `node_modules` sea compatible con la imagen de Playwright. |
| `build` | `toolchain` | `npm ci && npm run build` con el código copiado (no montado). Lo usan la imagen `web` y CI. |
| `web` | `nginx:alpine` | Sirve `dist/` con un `nginx.conf` mínimo: caché larga para los assets con hash y sin caché para `index.html`, `sw.js` ni el manifest. |

**`compose.yaml`**, con servicios:

| Servicio | Imagen | Qué hace | Puerto |
|---|---|---|---|
| `node` | stage `toolchain` | Contenedor de herramientas para tareas puntuales (`docker compose run --rm node npm …`). Monta el repo en `/app`. | — |
| `dev` | stage `toolchain` | `npm run dev -- --host 0.0.0.0` con recarga en caliente; vigila ficheros por polling si hace falta (Docker Desktop en macOS/Windows). | 5173 |
| `web` | stage `web` | Build de producción servido por nginx, para probar la PWA y el modo sin conexión. | 8080 |
| `e2e` | `mcr.microsoft.com/playwright:v<versión>-noble` | Ejecuta Playwright contra el servicio `web` (red interna de compose). La versión de la imagen debe coincidir exactamente con `@playwright/test` de `package.json`. | — |

Detalles obligatorios:

- `user: "${HOST_UID:-1000}:${HOST_GID:-1000}"` en `node`, `dev` y `e2e`. El `Makefile` exporta `HOST_UID`/`HOST_GID` a partir de `id -u`/`id -g`. No se usa `UID` porque es de solo lectura en bash.
- `HOME` y la caché de npm apuntan a un directorio escribible (p. ej. `npm_config_cache=/app/.cache/npm`, ignorado por git) para que funcione con un usuario no root.
- `node_modules/` vive en el directorio del proyecto (bind mount). Así el editor del host ve los tipos para el autocompletado. Solo se ejecuta dentro de los contenedores.
- `.dockerignore` excluye `node_modules`, `dist`, `.cache`, `coverage`, `playwright-report` y `.git`.
- **Probar en un móvil real por la LAN**: `http://192.168.x.x` **no** es un contexto seguro, así que el service worker no se registrará; el audio y el táctil sí funcionan. Para probar la PWA en el móvil hay dos opciones, ambas documentadas en el README:
  - `make dev-https`: el servicio `dev` con `@vitejs/plugin-basic-ssl`, aceptando el certificado en el móvil;
  - usar la URL de GitHub Pages.
- Compatibilidad del host: Linux, macOS (Docker Desktop, OrbStack o Colima) y Windows mediante WSL2, con `make` disponible.

### 10.5 Makefile (interfaz única)

Todo se lanza con `make`. `make` sin argumentos equivale a `make help`, que lista los objetivos con su descripción (autodocumentado con comentarios `##`).

| Objetivo | Qué hace |
|---|---|
| `make help` | Lista los objetivos |
| `make deps` | Descarga las librerías del proyecto (`node_modules/`) dentro del contenedor con `npm ci`. **Normalmente no hace falta llamarlo** (ver nota debajo). |
| `make dev` | Levanta `dev` en http://localhost:5173 |
| `make dev-https` | Igual, con HTTPS para probar la PWA desde un móvil en la LAN |
| `make lint` | ESLint y Prettier en modo comprobación |
| `make format` | Prettier escribiendo los cambios |
| `make typecheck` | `tsc --noEmit` |
| `make test` | Vitest (unit) una vez |
| `make test-watch` | Vitest en modo vigilancia |
| `make coverage` | Vitest con cobertura |
| `make build` | Build de producción en `dist/` (respeta `BASE_PATH`, p. ej. `make build BASE_PATH=/beepcode/`) |
| `make web` | Construye la imagen `web` y la sirve en http://localhost:8080 |
| `make e2e` | Levanta `web` y ejecuta Playwright (escritorio + móvil emulado) en el contenedor `e2e`; deja el informe en `playwright-report/` |
| `make ci` | `deps` + `lint` + `typecheck` + `test` + `build` + `e2e`: lo mismo que ejecuta CI |
| `make npm ARGS="…"` | Válvula de escape: ejecuta `npm …` en el contenedor (p. ej. `make npm ARGS="install -D foo"`) |
| `make shell` | Shell interactiva en el contenedor `node` |
| `make down` | Para y elimina los contenedores del proyecto |
| `make clean` | `down` y borra `dist`, `coverage`, `playwright-report` y `.cache` |
| `make distclean` | `clean` y borra también `node_modules` y las imágenes del proyecto |

**Dependencias automáticas.** Todos los objetivos que necesitan `node_modules/` (`dev`, `lint`, `test`, `build`, …) dependen de un fichero marcador (`node_modules/.deps-stamp`). Make lo regenera con `npm ci` solo cuando falta o cuando `package.json` o `package-lock.json` son más recientes. En la práctica:

- **Primera vez tras clonar:** `make dev` (o cualquier otro objetivo) descarga las librerías solo.
- **Tras un `git pull` que cambia dependencias:** se reinstalan solas en el siguiente `make`.
- **Añadir o quitar una librería:** `make npm ARGS="install -D <paquete>"`, que actualiza `package.json` y `package-lock.json`; después se hace commit de ambos.
- `make deps` existe solo para forzar la descarga a mano.

**Arranque desde cero (F0).** El `package-lock.json` inicial lo genera una sola vez Claude CLI al crear el proyecto, desde el contenedor (`make npm ARGS="install"`), y se versiona. A partir de ahí, siempre `npm ci`. No se usa nunca Node del host.

### 10.4 GitHub Pages

- Gratis para repositorios públicos.
- CI usa **los mismos objetivos de `make`** que en local (los runners `ubuntu-latest` traen Docker y make), sin `actions/setup-node`. Así lo que pasa en local pasa en CI.
  - **Solo `main` ejecuta Actions y se despliega** (decidido el 2026-11-20, [ADR 0007](docs/decisions/0007-ramas-y-despliegue-solo-desde-main.md)): no hay `ci.yml`; cada desarrollo va en una rama que acaba en `main`, y en las ramas se pasa `make ci` en local.
  - `deploy.yml`, al hacer push a `main` (salvo si solo cambia documentación): `make ci`, después `make build BASE_PATH=/<nombre-repo>/` y despliegue de `dist/` con `actions/configure-pages`, `actions/upload-pages-artifact` y `actions/deploy-pages`.
  - Opcional: caché de capas de Docker en CI para acelerar.
- En el repo, **Settings → Pages → Source: GitHub Actions**.
- Base path: `vite.config.ts` lee `BASE_PATH` (por defecto `/`). En el workflow se fija a `/<nombre-repo>/`; Docker y dev usan `/`. El manifest y el service worker deben respetar ese base path.
- Router por hash, así que no hace falta `404.html`.

---

## 11. Calidad y criterios de aceptación globales

- **Tests unitarios** (obligatorios) de `src/morse/`:
  - la tabla y el layout son coherentes (§2.2);
  - el keyer clasifica bien punto y raya, cierra letras y palabras con las pausas correctas, gestiona la secuencia inválida, el debounce y la cancelación (todo con reloj falso);
  - el player genera duraciones correctas, también con Farnsworth;
  - grabar y reproducir decodifica lo mismo.
- **Cobertura** ≥ 90 % en `src/morse/`.
- **E2E de humo**: cargar la app, teclear `.-..` con el teclado y con el pulsador (táctil emulado) y ver que la L queda en la cinta y que E, A, R y L se iluminan; cambiar de modo; cambiar de idioma y de tema.
- **Accesibilidad**: todos los controles operables por teclado, etiquetas ARIA, contraste AA en todos los temas y `prefers-reduced-motion` respetado.
- **Rendimiento**: sin dependencias pesadas en runtime y bundle inicial pequeño (objetivo < 100 kB gzip sin contar iconos). La latencia entre pulsar y que suene el tono no debe notarse.
- **Compatibilidad**: últimas 2 versiones de Chrome, Safari (iOS y macOS), Firefox y Edge.

---

## 12. Decisiones abiertas (a refinar)

1. ~~**Nombre** del proyecto y del repositorio~~: **beepcode** (decidido el 2026-11-20, [ADR 0005](docs/decisions/0005-nombre-y-licencias.md)).
2. ~~**Licencia**~~: **GPL-3.0-or-later** para el código y **CC BY-SA 4.0** para el logo y los textos (decidido el 2026-11-20, [ADR 0005](docs/decisions/0005-nombre-y-licencias.md)).
3. ~~**Diseño final de la cinta histórica**~~: solo texto corrido, con letra legible en cualquier pantalla; sin el código debajo y sin acción al tocar una letra (decidido el 2026-11-20, §3.4).
4. ~~**Paletas** de color definitivas~~: Gruvbox oscuro, Gruvbox claro y Alto contraste, además de claro y oscuro; y un ajuste de visión del color por tipo de daltonismo (decidido el 2026-11-20, §7). Queda la **iconografía** (el icono de la app): la dibuja el usuario ([TODO 7](docs/todo/07-logo.md)).
5. ~~Si se persiste el histórico del modo Libre entre sesiones~~: **no** (decidido el 2026-11-20, §3.4).

---

## 13. Roadmap por fases

Cada fase termina con tests en verde, la app desplegada en Pages y un README actualizado.

| Fase | Contenido | Criterio de "hecho" |
|---|---|---|
| **F0 — Andamiaje** | `Makefile`, `Dockerfile` y `compose.yaml` (§10.3, §10.5); Vite + TS, ESLint/Prettier, Vitest y Playwright, todo instalado desde contenedor; CI y deploy a Pages con `make`; PWA mínima, tokens de tema, i18n base | En un equipo con solo Docker y make: `make ci` en verde y `make web` sirve una página "hola" instalable. Ningún fichero generado pertenece a root. Pages publicado. |
| **F1 — Núcleo + Libre** | `morse/` completo (alphabet, tree, timing, keyer), árbol SVG con estados, pulsador, teclado, audio, vibración, cinta histórica, modo Libre con Explorar, ajustes y temas, 5 idiomas | E2E de `.-..` → L en móvil y escritorio; sin conexión funciona |
| **F2 — Texto → Morse** | `player.ts`, modo Texto con resaltado y control de reproducción | Reproducción precisa a WPM y Farnsworth |
| **F3 — Aprender + Escuchar** | Ambos modos, conjuntos de letras, niveles de ayuda, listas de palabras por idioma | Flujo completo de acierto y fallo en ambos modos |
| **F4 — Grabar y reproducir** | `recorder.ts`, lista de grabaciones persistida | Una grabación reproducida produce exactamente el mismo texto |
| **F5 — Estadísticas** | Precisión por letra, evolución, velocidad media, progresión Koch automática | (a especificar al llegar) |
| **Futuro — Modo Pro** | Números, puntuación, prosignos y caracteres nacionales con un árbol extendido (más niveles); manipulador iámbico; temporización adaptativa; exportar/compartir grabaciones | — |
