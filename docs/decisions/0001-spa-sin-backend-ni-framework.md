# ADR 0001 — Una SPA sin backend y sin framework

Estado: aceptada (2026-11-20, de SPEC §1 y §10.1)

## Contexto

beepcode recrea en el navegador una tarjeta con un pulsador y unos LED. Lo
que hace falta es poco: un SVG que se ilumina, un tono, temporizadores y unos
ajustes. Todo cabe en el navegador, y la app tiene que funcionar sin conexión.

## Decisión

- **Sin backend**: todo el estado (ajustes, grabaciones) en `localStorage`.
- **Vite + TypeScript `strict`, sin framework**: DOM y SVG a mano, con
  componentes pequeños que son funciones.
- Vitest para los tests unitarios, Playwright para los e2e, ESLint y Prettier.

## Razones

- **La latencia manda.** Entre pulsar y oír el tono no puede notarse nada; un
  framework con su ciclo de render no aporta y añade capas entre el
  `pointerdown` y el `AudioContext`.
- **Bundle pequeño** (objetivo < 100 kB gzip): carga al instante en un móvil y
  el service worker precachea poco.
- **Sin backend no hay nada que mantener ni que pagar**, y la privacidad es
  trivial: nada sale del navegador.

## Consecuencias

- Hay que ser disciplinado con la estructura: un fichero por componente o modo
  (SPEC §10.2) y los eventos del keyer como único punto de unión (ADR 0003).
- Toda dependencia de runtime nueva se justifica en un ADR.
- Sin sincronización entre dispositivos: exportar e importar grabaciones queda
  para una fase posterior (SPEC §6.4).
