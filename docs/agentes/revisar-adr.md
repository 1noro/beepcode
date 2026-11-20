# Revisar las decisiones

Procedimiento para comprobar que el código respeta las decisiones
documentadas. Lo siguen igual una persona o cualquier agente de IA; los
comandos `/revisar-adr` de cada herramienta solo apuntan aquí.

Revisa que el código cumple las decisiones de `docs/decisions/`, las reglas de
`AGENTS.md` ("Decisiones cerradas" y "Reglas que no se saltan") y lo que el
SPEC pide de las fases ya hechas. Si `AGENTS.md` y un ADR no dicen lo mismo,
manda el ADR: dilo en el informe para que se corrija la lista. Comprueba en
concreto:

- **ADR 0001**: ¿ha entrado un framework o una dependencia de runtime sin un
  ADR que la justifique? ¿Algo habla con un servidor? ¿El bundle inicial sigue
  por debajo de 100 kB gzip sin iconos (la salida de `make build`)?
- **ADR 0002**: ¿algún objetivo, script o documento ejecuta `node`, `npm`,
  `npx` o `vite` en el host? ¿Todo contenedor que monta el repo lleva `user:`
  con `HOST_UID`/`HOST_GID`? ¿Hay algo de root (`make owner-check`)? ¿La
  versión de Node está solo en el `Dockerfile` y en `engines`? ¿La imagen de
  Playwright de `compose.yaml` es la misma versión exacta que
  `@playwright/test`?
- **ADR 0003**: ¿importa algo `src/morse/` de fuera de su carpeta, o usa el
  DOM, el audio o `localStorage`? ¿El keyer recibe el reloj y emite eventos
  sin conocer a quien escucha? ¿Algún modo toca el keyer por dentro? ¿El
  alfabeto y el layout siguen siendo datos, con el test de SPEC §2.2? ¿La
  cobertura de `src/morse/` sigue ≥ 90 % (`make coverage`)?
- **ADR 0004**: ¿alguna ruta va sin hash, o algún asset o enlace con `/` fijo
  en vez del base path? ¿Los workflows llaman a `make`, sin
  `actions/setup-node`?
- **ADR 0005**: ¿`package.json` sigue en `GPL-3.0-or-later`? ¿Una dependencia
  nueva es compatible?
- **ADR 0006**: ¿`CLAUDE.md` es solo `@AGENTS.md`? ¿Hay en `AGENTS.md` algo
  que solo entienda una herramienta? ¿Algún commit lleva una línea de
  atribución a una IA (`git log`)?
- **Entrada** (SPEC §3.5, §3.6): ¿el pulsador usa `pointerdown`/`pointerup`,
  nunca `click`, con `setPointerCapture` y un solo puntero? ¿El teclado ignora
  `event.repeat` y fuerza el "soltar" en `blur` y `visibilitychange`?
- **i18n y temas**: ¿hay alguna cadena visible fuera de `t()`? ¿Algún color
  fuera de las variables de `tokens.css`? ¿Se respeta
  `prefers-reduced-motion`?

Informa de lo que encuentres. No arregles nada sin preguntar antes.
