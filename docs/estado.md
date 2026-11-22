# Estado

**Al día:** 2026-11-22, 00:45 UTC. **Revisada:** 2026-11-20, la última
[`/revisar-docs`](agentes/revisar-docs.md), que se lanza a mano cada semana.

Lo vivo del desarrollo: en qué fase está, qué hay publicado, lo abierto y lo
que espera al usuario. **Se reescribe, no se le añade**: lo que pasa cada día
va a la [bitácora](bitacora/), y cada TODO tiene su ficha en [`todo/`](todo/).
Qué va en cada sitio, en `AGENTS.md`, "Dónde va cada información".

## La fase

**F0, el andamiaje, F1, el núcleo y el modo Libre, y F2, texto a Morse:
cerrados** ([TODO 1](todo/01-andamiaje.md),
[TODO 2](todo/02-nucleo-y-modo-libre.md),
[TODO 3](todo/03-texto-a-morse.md)), publicados como **v0.2.0**, y unos
refinamientos antes de F3, como **v0.3.0** y **v0.4.0**. Lo siguiente, **F3**: Aprender y Escuchar. El plan entero, en SPEC §13; v1 es
de F0 a F4, y F5 (las estadísticas) llega al final.

## Lo publicado

- **v0.4.0, el modo Libre (F1) y el modo Texto → Morse (F2)**, en
  `https://1noro.github.io/beepcode/`. Desde v0.3.0, las mejoras gráficas
  de la rama `feat/mejoras-graficas`, con un principio: **los componentes,
  equiparables entre modos**. El árbol arriba desde la punta de la antena,
  las ayudas en el mismo pie, el cursor de bloque, la cinta de `#/free`
  como el texto de `#/text` (centrada, con la filigrana, ⌫ junto al
  pulsador), y todas las teclas de abajo con el cuerpo del pulsador, solo
  con sus símbolos salvo con "botones descriptivos". Se despliega con
  [`/desplegar`](agentes/desplegar.md).
  **Solo se publica `main`** (ADR 0007): `deploy.yml`, en cada push a `main`
  que no sea solo documentación.
- **La versión** sale de `git describe --tags --dirty --always` y se ve en
  los ajustes, "Acerca de": en `main`, el tag; entre tags, el tag con los
  commits que lleva encima.

## Lo abierto, en este orden

| TODO | Estado | Qué falta |
|---|---|---|
| [7](todo/07-logo.md), el logo | a la espera | Que lo dibuje el usuario; hay uno provisional |
| [4](todo/04-aprender-y-escuchar.md), F3, Aprender y Escuchar | abierto | Todo; el siguiente |
| [5](todo/05-grabar-y-reproducir.md), F4, grabar y reproducir | abierto | Todo |
| [6](todo/06-estadisticas.md), F5, las estadísticas | a futuro | Especificarlas con el usuario |
| [8](todo/08-modo-pro.md), el Modo Pro | a futuro | Fuera de v1 |
| [9](todo/09-vibracion.md), refinar la vibración | a futuro | Probar en Chrome en Android; hoy viene desactivada |

## Lo pendiente del usuario

- **`make hooks`**, una vez en este clon: el pre-commit con `make docs-check`.
- **El logo** ([TODO 7](todo/07-logo.md)).
- **Que alguien nativo revise** las traducciones al gallego, catalán y euskera
  ([`traducciones.md`](traducciones.md)): 66 textos con F1, 78 con F2 y 82
  con v0.3.0; desde entonces, `key.delete`, `key.deleteHint` y
  `settings.descriptiveButtons`.
- **Probar v0.4.0 en un móvil** (o con `make dev-https`): el sonido y el
  táctil no tienen e2e, y desde la prueba en el Pixel 7 cambiaron el
  pulsador, las pausas y el centrado del árbol; del modo Texto, escribir
  sobre el texto con el teclado del móvil y la barra de desplazamiento en el
  PC; de v0.3.0, el botón ␣; de v0.4.0, ⌫ y las proporciones de las teclas
  y del árbol en un móvil de verdad.
- **El SPEC**, si lo acepta: el nuevo orden de la pantalla (§3.2, §3.4,
  §6.5; el árbol arriba, la cinta centrada, ⌫ junto al pulsador) y el
  ajuste "botones descriptivos" (§7).

## Lo próximo

- **La vibración**, hoy en la sección "Modo Libre" de los ajustes: cuando
  Aprender use el pulsador (F3), pasará a una sección común.
- **F3 con `/tarea 4`**: Aprender y Escuchar, que usarán `player.ts`.
