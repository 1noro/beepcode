# TODO 7 — El logo

**Estado:** a la espera · **SPEC:** §9, §12.4 · **ADR:** [0005](../decisions/0005-nombre-y-licencias.md) · **Código:** `assets/icon/`, `pwa-assets.config.ts`, `TODO(7)`

## Qué pide

El logo de beepcode, que **dibuja el usuario**, con licencia CC BY-SA 4.0. De
él salen el icono de la PWA (192, 512 y maskable), el favicon, el
`apple-touch-icon` y el que va en el README y en la barra de la app.

## Dónde está

A la espera del usuario. Mientras, un icono provisional en
`assets/icon/beepcode.svg`: un punto verde y una raya roja sobre fondo oscuro.

**Para cambiarlo** (ver [`assets/icon/README.md`](../../assets/icon/README.md)):

1. El maestro en `assets/icon/` (y los originales, en `assets/icon/original/`).
   Si es un PNG en vez de un SVG, se cambia la ruta en el objetivo `icons` de
   `package.json`.
2. `make icons` regenera `public/`.
3. El color de fondo, en `pwa-assets.config.ts` y en `vite.config.ts`
   (`brandColor`, `theme_color`), y en `index.html` (`theme-color`): los marca
   `TODO(7)`.
4. Con un logo con detalle a 16 px, quizá un favicon simplificado aparte.

<!-- docs:historia -->
## Historia
