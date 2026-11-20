# El icono de beepcode

**Provisional**: un punto verde y una raya roja sobre fondo oscuro, hasta que
el usuario dibuje el logo ([TODO 7](../../docs/todo/07-logo.md)).

**Licencia: [Creative Commons Atribución-CompartirIgual 4.0 Internacional
(CC BY-SA 4.0)](https://creativecommons.org/licenses/by-sa/4.0/deed.es)**,
aparte de la del código (GPL-3.0). Vale para todo lo de esta carpeta y para lo
que se genera de ella en `public/`.

## Qué hay aquí

| Fichero | Qué es |
|---|---|
| `beepcode.svg` | **El maestro** |
| `original/` | Cuando llegue el logo: los dibujos tal como se hicieron (por ejemplo, el `.xcf`) |

## Cómo se genera el set

`make icons` copia el maestro a `public/favicon.svg` y, con
`@vite-pwa/assets-generator` (`pwa-assets.config.ts`, preset `minimal-2023`),
genera en `public/`:

| Fichero | Para qué |
|---|---|
| `favicon.svg`, `favicon.ico` | la pestaña del navegador |
| `pwa-64x64.png`, `pwa-192x192.png`, `pwa-512x512.png` | el manifest de la PWA |
| `maskable-icon-512x512.png` | el icono adaptable de Android, con margen y fondo |
| `apple-touch-icon-180x180.png` | iOS, con fondo |

**Lo generado va en el repo y no se edita a mano**: se cambia el maestro y se
vuelve a generar. Los pasos para el logo definitivo, en su ficha.
