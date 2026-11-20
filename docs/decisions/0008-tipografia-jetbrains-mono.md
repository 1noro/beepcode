# ADR 0008 — Toda la interfaz en JetBrains Mono, servida con la app

Estado: aceptada (2026-11-20, por el usuario)

## Contexto

La cinta usaba la monoespaciada del sistema y el resto, la sans del sistema.
En Android la monoespaciada del sistema, con solo mayúsculas, apenas se
distingue de una sans, y cada dispositivo pintaba la app con su letra. El
usuario quiere una estética homogénea entre dispositivos, con aire de
telégrafo y de terminal antigua.

## Decisión

- **Toda la interfaz, en JetBrains Mono** (SIL Open Font License 1.1): un
  solo token, `--font-mono` en `src/styles/tokens.css`, con las del sistema
  detrás por si acaso.
- **Servida con la app**, nunca desde Google Fonts ni otro CDN: el paquete
  `@fontsource-variable/jetbrains-mono` (de desarrollo) trae el fichero, Vite
  lo empaqueta con su hash y el service worker lo precachea.
- **Solo el subconjunto latino y el fichero variable** (todos los pesos en
  uno, 40 kB en woff2), declarado a mano en `src/styles/fonts.css`; ni la
  cursiva ni los otros alfabetos. El latino cubre los cinco idiomas, `·` y
  `−`.
- **Sin ligaduras** (`font-variant-ligatures: none`): las de programación
  juntarían `.-` o `->` en un glifo.

## Razones

- La misma letra en todos los dispositivos, y una monoespaciada que se
  reconoce como tal.
- Servirla nosotros: funciona sin conexión, no avisa a terceros de cada
  visita y no depende de su disponibilidad.
- 40 kB caben en el objetivo de un bundle inicial de menos de 100 kB
  (hoy, unos 60 kB con la fuente).

## Consecuencias

- **La OFL es compatible con la GPL del código**: la fuente se distribuye con
  su propia licencia, que lleva el paquete y se cita en el README.
- Lo que caiga fuera del subconjunto latino (los caracteres nacionales del
  Modo Pro, por ejemplo) sale con la monoespaciada del sistema; entonces se
  añade el subconjunto `latin-ext` (15 kB).
- La monoespaciada es más ancha: los textos largos de los ajustes ocupan más
  líneas. Se revisa al traducir.
