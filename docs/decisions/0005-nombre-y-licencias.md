# ADR 0005 — El nombre, beepcode, y las licencias

Estado: aceptada (2026-11-20, por el usuario; cierra SPEC §12.1 y §12.2)

## Contexto

El SPEC dejaba abiertos el nombre (provisional, `morse-tree-trainer`) y la
licencia (propuesta, MIT). El repositorio ya se llamaba `beepcode`.

## Decisión

- **El nombre es beepcode**, en minúsculas, también en la app y en el
  manifest. En Pages, `https://1noro.github.io/beepcode/`.
- **El código, GPL-3.0-or-later** ([`LICENSE.GPL-3.0.txt`](../../LICENSE.GPL-3.0.txt)).
- **El logo y los textos (documentación, traducciones y listas de palabras),
  CC BY-SA 4.0** ([`LICENSE.CC-BY-SA-4.0.txt`](../../LICENSE.CC-BY-SA-4.0.txt)).
- Como en dhtcrawler, del mismo autor.

## Razones

- El usuario prefiere el copyleft: quien lo mejore y lo distribuya, lo
  comparte.
- Una licencia de contenido para lo que no es código: el logo (que dibujará el
  usuario, [TODO 7](../todo/07-logo.md)) se puede reutilizar citando al autor.

## Consecuencias

- `package.json` dice `GPL-3.0-or-later`.
- Una dependencia de runtime nueva tiene que ser compatible con la GPL-3.0.
