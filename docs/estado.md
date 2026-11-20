# Estado

**Al día:** 2026-11-20, 15:00 UTC. **Revisada:** 2026-11-20, la última
[`/revisar-docs`](agentes/revisar-docs.md), que se lanza a mano cada semana.

Lo vivo del desarrollo: en qué fase está, qué hay publicado, lo abierto y lo
que espera al usuario. **Se reescribe, no se le añade**: lo que pasa cada día
va a la [bitácora](bitacora/), y cada TODO tiene su ficha en [`todo/`](todo/).
Qué va en cada sitio, en `AGENTS.md`, "Dónde va cada información".

## La fase

**F0, el andamiaje, y F1, el núcleo y el modo Libre: cerrados**
([TODO 1](todo/01-andamiaje.md), [TODO 2](todo/02-nucleo-y-modo-libre.md)),
publicados como **v0.1.0**. Lo siguiente es F2, texto a Morse
([TODO 3](todo/03-texto-a-morse.md)). El plan entero, en SPEC §13; v1 es de
F0 a F4, y F5 (las estadísticas) llega al final.

## Lo publicado

- **v0.1.0, el modo Libre** (F1), en `https://1noro.github.io/beepcode/`.
  **Solo se publica `main`** (ADR 0007): `deploy.yml`, en cada push a `main`
  que no sea solo documentación.
- **La versión** sale de `git describe --tags --dirty --always` y se ve en
  los ajustes, "Acerca de": en `main`, el tag; entre tags, el tag con los
  commits que lleva encima.

## Lo abierto, en este orden

| TODO | Estado | Qué falta |
|---|---|---|
| [7](todo/07-logo.md), el logo | a la espera | Que lo dibuje el usuario; hay uno provisional |
| [3](todo/03-texto-a-morse.md), F2, texto a Morse | abierto | Todo |
| [4](todo/04-aprender-y-escuchar.md), F3, Aprender y Escuchar | abierto | Todo; tras el 3 |
| [5](todo/05-grabar-y-reproducir.md), F4, grabar y reproducir | abierto | Todo |
| [6](todo/06-estadisticas.md), F5, las estadísticas | a futuro | Especificarlas con el usuario |
| [8](todo/08-modo-pro.md), el Modo Pro | a futuro | Fuera de v1 |
| [9](todo/09-vibracion.md), refinar la vibración | a futuro | Probar en Chrome en Android; hoy viene desactivada |

## Lo pendiente del usuario

- **`make hooks`**, una vez en este clon: el pre-commit con `make docs-check`.
- **El logo** ([TODO 7](todo/07-logo.md)).
- **Que alguien nativo revise** las traducciones al gallego, catalán y euskera
  ([`traducciones.md`](traducciones.md)), que con F1 pasan de 8 textos a 66.
- **Probar v0.1.0 en un móvil** (o con `make dev-https`): el sonido y el
  táctil no tienen e2e, y desde la prueba en el Pixel 7 cambiaron el
  pulsador, las pausas y el centrado del árbol.

## Lo próximo

- **F2 con `/tarea 3`**: texto a Morse, con `player.ts` (SPEC §6.5) y el
  ajuste del WPM efectivo (Farnsworth), que espera en `TODO(3)`.
