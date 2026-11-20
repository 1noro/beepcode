# Las decisiones

Una por fichero, con su contexto, sus razones y sus consecuencias. **No se
reescriben**: si algo cambia, se añade un apartado fechado al final. Lo
vigente, resumido, en `AGENTS.md`, "Decisiones cerradas"; si los dos no dicen
lo mismo, manda el ADR, y se corrige la lista.

| ADR | Qué decide |
|---|---|
| [0001](0001-spa-sin-backend-ni-framework.md) | Una SPA sin backend y sin framework: Vite + TypeScript, DOM y SVG a mano |
| [0002](0002-solo-docker-y-make.md) | En el host, solo Docker y `make`; Node, en un contenedor |
| [0003](0003-logica-morse-pura-y-datos.md) | `src/morse/` es lógica pura, y el alfabeto y el árbol son datos |
| [0004](0004-github-pages-y-rutas-hash.md) | GitHub Pages con rutas por hash, y CI con los mismos `make` que en local |
| [0005](0005-nombre-y-licencias.md) | El nombre, beepcode; GPL-3.0 para el código y CC BY-SA 4.0 para el logo y los textos |
| [0006](0006-documentacion-para-agentes.md) | La documentación y los agentes, como en dhtcrawler |
| [0007](0007-ramas-y-despliegue-solo-desde-main.md) | Se desarrolla en ramas que acaban en `main`, y solo `main` se despliega y ejecuta GitHub Actions |
