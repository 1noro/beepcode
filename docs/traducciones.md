# Las traducciones

La app habla **inglés** (por defecto y de reserva), **castellano**,
**gallego**, **catalán** y **euskera** (SPEC §8). Detecta el idioma del
navegador (`navigator.languages`) y se puede cambiar a mano.

## Dónde están

- `src/i18n/locales/<idioma>.json`: claves planas (`"pwa.reload": "Reload"`).
  **`en.json` es la referencia**: las claves de los demás salen de ahí, y un
  test (`tests/unit/i18n.test.ts`) exige que todos tengan las mismas, ninguna
  vacía y los mismos `{marcadores}`.
- Con F3, las listas de palabras del modo Aprender, en `src/i18n/words/`,
  normalizadas a A–Z (sin tildes; se descartan las que llevan Ñ o Ç).

## Cómo se añade un texto

1. La clave y el texto en `en.json`.
2. La misma clave en los otros cuatro.
3. En el código, `t('la.clave')`; con valores, `t('la.clave', { n: 3 })` y
   `{n}` en el texto. **En el DOM, `tText(nodo, 'la.clave')` o
   `tAttr(nodo, 'aria-label', 'la.clave')`** (`src/i18n/dom.ts`): recuerdan la
   clave, y al cambiar de idioma se traduce todo sin rehacer la página.

## La revisión

Las traducciones al gallego, catalán y euskera **las genera la IA** y están
**pendientes de revisión por un hablante nativo**. El castellano lo revisa el
usuario.

| Idioma | Fichero | Revisado por un nativo |
|---|---|---|
| Inglés | `en.json` | referencia |
| Castellano | `es.json` | pendiente (el usuario) |
| Gallego | `gl.json` | **pendiente** |
| Catalán | `ca.json` | **pendiente** |
| Euskera | `eu.json` | **pendiente** |

Quien revise uno, que cambie su fila aquí con la fecha.

Los textos de las traducciones van bajo CC BY-SA 4.0, como el resto del
contenido (ADR 0005).
