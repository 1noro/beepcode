# ADR 0004 — GitHub Pages con rutas por hash, y CI con los mismos make

Estado: aceptada (2026-11-20, de SPEC §6 y §10.4); los workflows, en F0
([TODO 1](../todo/01-andamiaje.md))

## Contexto

Una SPA sin backend necesita un sitio estático con HTTPS (el service worker lo
exige). GitHub Pages es gratis para repositorios públicos, pero sirve la app
bajo `/<repo>/` y no reescribe rutas.

## Decisión

- **Publicación en GitHub Pages** con `actions/deploy-pages`, al hacer push a
  `main`. En el repo, **Settings → Pages → Source: GitHub Actions**.
- **Rutas por hash** (`#/free`, `#/learn`…): sin `404.html` ni trucos.
- **El base path sale de `BASE_PATH`** (por defecto `/`; en Pages,
  `/beepcode/`). El manifest y el service worker lo respetan.
- **CI llama a los mismos objetivos de `make`** que en local, sin
  `actions/setup-node`: `ci.yml` hace `make ci` en cada push y PR, y
  `deploy.yml`, `make ci` y `make build BASE_PATH=/<repo>/`.

## Razones

- HTTPS y CDN gratis, sin servidor que mantener.
- Con hash, cualquier recarga cae en `index.html`.
- Con los mismos `make`, lo que pasa en local pasa en CI.

## Consecuencias

- Las URLs llevan `#`. No hay SEO por ruta, y no hace falta.
- Todo enlace o asset va relativo al base path (`import.meta.env.BASE_URL`).
- CI construye las imágenes de Docker en cada ejecución; si se hace lento, la
  caché de capas es opcional (SPEC §10.4).

## 2026-11-20 — sin `ci.yml`

El usuario no quiere gastar ejecuciones de Actions en lo que no se publica:
**`ci.yml` desaparece** y solo queda `deploy.yml`, en cada push a `main` que
no sea solo documentación. Las ramas se verifican con `make ci` en local. Ver
[ADR 0007](0007-ramas-y-despliegue-solo-desde-main.md).
