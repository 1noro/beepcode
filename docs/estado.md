# Estado

**Al día:** 2026-11-20, 13:00 UTC. **Revisada:** 2026-11-20, la última
[`/revisar-docs`](agentes/revisar-docs.md), que se lanza a mano cada semana.

Lo vivo del desarrollo: en qué fase está, qué hay publicado, lo abierto y lo
que espera al usuario. **Se reescribe, no se le añade**: lo que pasa cada día
va a la [bitácora](bitacora/), y cada TODO tiene su ficha en [`todo/`](todo/).
Qué va en cada sitio, en `AGENTS.md`, "Dónde va cada información".

## La fase

**F0, el andamiaje: cerrado** ([TODO 1](todo/01-andamiaje.md)), publicado
y con CI en verde. **Lo siguiente es F1** (el núcleo y el modo Libre). El plan entero, en SPEC §13; v1 es
de F0 a F4, y F5 (las estadísticas) llega al final.

## Lo publicado

- **La página "hola" de F0**, en `https://1noro.github.io/beepcode/`, desde
  `25ce416`. **Solo se publica `main`** (ADR 0007): `deploy.yml`, en cada push
  a `main` que no sea solo documentación.
- **En desarrollo**: la rama `ci/despliegue-solo-main` (este cambio de flujo),
  sin llevar a `main`.
- **Sin versión**: `package.json` está en `0.0.0` y no hay tags.

## Lo abierto, en este orden

| TODO | Estado | Qué falta |
|---|---|---|
| [2](todo/02-nucleo-y-modo-libre.md), F1, el núcleo y el modo Libre | abierto | Todo; lo que quedaba abierto en SPEC §12, ya decidido en su ficha |
| [7](todo/07-logo.md), el logo | a la espera | Que lo dibuje el usuario; hay uno provisional |
| [3](todo/03-texto-a-morse.md), F2, texto a Morse | abierto | Todo; tras el 2 |
| [4](todo/04-aprender-y-escuchar.md), F3, Aprender y Escuchar | abierto | Todo; tras el 2 y el 3 |
| [5](todo/05-grabar-y-reproducir.md), F4, grabar y reproducir | abierto | Todo; tras el 2 |
| [6](todo/06-estadisticas.md), F5, las estadísticas | a futuro | Especificarlas con el usuario |
| [8](todo/08-modo-pro.md), el Modo Pro | a futuro | Fuera de v1 |

## Lo pendiente del usuario

- **`make hooks`**, una vez en este clon: el pre-commit con `make docs-check`.
- **El logo** ([TODO 7](todo/07-logo.md)).
- **Que alguien nativo revise** las traducciones al gallego, catalán y euskera
  ([`traducciones.md`](traducciones.md)).

## Lo próximo

- **F1 con `/tarea 2`**, en una rama `feat/…` (ADR 0007), paso a paso (el
  orden, en su ficha).
