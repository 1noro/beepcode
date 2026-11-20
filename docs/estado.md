# Estado

**Al día:** 2026-11-20, 11:45 UTC. **Revisada:** 2026-11-20, la última
[`/revisar-docs`](agentes/revisar-docs.md), que se lanza a mano cada semana.

Lo vivo del desarrollo: en qué fase está, qué hay publicado, lo abierto y lo
que espera al usuario. **Se reescribe, no se le añade**: lo que pasa cada día
va a la [bitácora](bitacora/), y cada TODO tiene su ficha en [`todo/`](todo/).
Qué va en cada sitio, en `AGENTS.md`, "Dónde va cada información".

## La fase

**F0, el andamiaje: hecho y sin commitear** ([TODO 1](todo/01-andamiaje.md)).
`make ci` pasa en local; falta subirlo y publicar en Pages para cerrarlo.
Después, **F1** (el núcleo y el modo Libre). El plan entero, en SPEC §13; v1 es
de F0 a F4, y F5 (las estadísticas) llega al final.

## Lo publicado

- **Nada todavía.** Al subir `main` con Pages activado, en
  `https://1noro.github.io/beepcode/` (el workflow `deploy.yml`).
- **Sin versión**: `package.json` está en `0.0.0` y no hay tags.

## Lo abierto, en este orden

| TODO | Estado | Qué falta |
|---|---|---|
| [1](todo/01-andamiaje.md), F0, el andamiaje | a la espera | Que el usuario lo revise, lo commitee, lo suba y active Pages |
| [2](todo/02-nucleo-y-modo-libre.md), F1, el núcleo y el modo Libre | abierto | Todo; antes, las tres preguntas de SPEC §12 de su ficha |
| [7](todo/07-logo.md), el logo | a la espera | Que lo dibuje el usuario; hay uno provisional |
| [3](todo/03-texto-a-morse.md), F2, texto a Morse | abierto | Todo; tras el 2 |
| [4](todo/04-aprender-y-escuchar.md), F3, Aprender y Escuchar | abierto | Todo; tras el 2 y el 3 |
| [5](todo/05-grabar-y-reproducir.md), F4, grabar y reproducir | abierto | Todo; tras el 2 |
| [6](todo/06-estadisticas.md), F5, las estadísticas | a futuro | Especificarlas con el usuario |
| [8](todo/08-modo-pro.md), el Modo Pro | a futuro | Fuera de v1 |

## Lo pendiente del usuario

- **Revisar y commitear** lo de la primera sesión (los agentes no commitean).
- **Activar Pages**: Settings → Pages → Source: **GitHub Actions**.
- **`make hooks`**, una vez en este clon: el pre-commit con `make docs-check`.
- **El logo** ([TODO 7](todo/07-logo.md)).
- **Las preguntas de SPEC §12** que quedan (la cinta, las paletas, guardar el
  histórico), antes de llegar a ellas en F1.
- **Que alguien nativo revise** las traducciones al gallego, catalán y euskera
  ([`traducciones.md`](traducciones.md)).

## Lo próximo

- Con F0 publicado, **F1 con `/tarea 2`**, paso a paso (el orden, en su
  ficha).
