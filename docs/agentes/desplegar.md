# Desplegar

Procedimiento para publicar la rama en curso: la lleva a `main` con su
versión y comprueba que el despliegue termina bien. Lo siguen igual una
persona o cualquier agente de IA; los comandos `/desplegar` de cada
herramienta solo apuntan aquí. **Lanzarlo es la petición del usuario** de
commitear, subir, llegar a `main` y etiquetar que piden `AGENTS.md` ("Flujo
de git") y el ADR 0007; nada más queda autorizado (ni borrar la rama, ni
forzar nada).

Admite un argumento opcional: la versión (`0.2.0`) o el salto (`patch`,
`minor`, `major`). Sin él, la versión sale del `CHANGELOG.md` (paso 3).

Se habla con el usuario en castellano. Ningún commit, PR, merge ni tag lleva
una línea de atribución a una IA, aunque la herramienta lo haga por defecto.

## 1. Comprobar que se puede

Si algo de esto falla, se para y se dice qué; no se arregla por las bravas.

- **La rama**: una de desarrollo (`<tipo>/<slug>`), nunca `main`. Si se está
  en `main`, no hay nada que desplegar desde aquí.
- **GitHub**: `gh auth status` con sesión.
- **`main` no se ha movido**: `git fetch origin --tags` y `origin/main` tiene
  que estar en la rama (`git merge-base --is-ancestor origin/main HEAD`). Si
  no, se pregunta al usuario cómo traerlo; no se hace rebase por iniciativa
  propia.
- **Hay algo que publicar**: "Sin publicar" del `CHANGELOG.md` tiene
  entradas. Si está vacío y hay cambios de código, se para: primero el
  changelog.

## 2. Commitear lo pendiente

Lo que haya sin commitear (`git status`), en commits lógicos con
[Conventional Commits](https://www.conventionalcommits.org/) en castellano,
como pide `AGENTS.md`: sin mezclar refactor y funcionalidad, y sin ficheros
temporales (capturas, specs de prueba) ni secretos. Si algo no se sabe de
dónde sale, se pregunta antes de incluirlo.

## 3. La versión

- **El número**: el del argumento; si no hay, el salto lo dice "Sin
  publicar". Mientras la versión sea 0.x, con **Añadido** o **Cambiado** sube
  la menor (`0.1.0` → `0.2.0`), y con solo **Corregido** o
  **Documentación**, el parche (`0.2.0` → `0.2.1`). Desde 1.0, un cambio que
  rompe algo sube la mayor. Se dice al usuario qué versión sale y por qué.
- **`package.json` y `package-lock.json`**: `make npm ARGS="version <X>
  --no-git-tag-version"`.
- **`CHANGELOG.md`**: "Sin publicar" pasa a `## <X> — <fecha>` (la de hoy,
  ISO) con lo que tenía, y queda un "Sin publicar" vacío encima.
- **La documentación**: en `docs/estado.md`, la versión en "Lo publicado" y
  la fase; las fichas cuyo único pendiente era llegar a `main` o el tag se
  cierran (`**Estado:** cerrado`) y salen de "Lo abierto"; cualquier otra se
  deja como está. Un apartado en la bitácora del día: qué versión se
  despliega y qué lleva.
- **`make ci` en verde** (ADR 0007). Si falla, se para: ni commit de versión
  ni nada más.
- **Dos commits**: `docs: …` con el estado, las fichas y la bitácora, y
  `chore: v<X>, <lo principal en pocas palabras>` con la versión y el
  changelog.

## 4. La PR

- `git push -u origin <rama>`.
- `gh pr create --base main --head <rama>`, con título `v<X>: <lo
  principal>` y, de cuerpo, en castellano, qué trae la rama: la sección
  `<X>` del changelog y las fichas que cierra. Sin pie de ninguna
  herramienta.

## 5. A `main`, con su tag

El merge se hace en local y no con el botón de GitHub, para que **el tag
llegue en el mismo push que `main`**: el build sale de `git describe`, y si
el tag llegara después, la app publicada diría `v<X-1>-N-g…` en vez de
`v<X>`. GitHub marca la PR como mergeada sola al ver sus commits en `main`.

```bash
git switch main
git pull --ff-only origin main
git merge --no-ff <rama> -m "merge: v<X>, <qué trae la rama>"
git tag -a v<X> -m "v<X>, <lo principal>"
git push --atomic origin main v<X>
```

Después, `gh pr view <n> --json state` tiene que decir `MERGED`. La rama no
se borra salvo que lo pida el usuario; se queda en `main`, y lo siguiente
empieza en una rama nueva.

## 6. Esperar al despliegue

- **La ejecución**: la de `deploy.yml` cuyo `headSha` es el del merge
  (`gh run list --workflow deploy.yml --branch main --json
  databaseId,headSha,status`); puede tardar unos segundos en aparecer.
  Tiene que haberla: el commit de versión toca `package.json`, que
  `paths-ignore` no excluye.
- **Esperarla**: `gh run watch <id> --exit-status` (unos minutos: `make ci`
  entero, el build y Pages).
- **Si falla**: `gh run view <id> --log-failed`, y se le cuenta al usuario
  qué paso falló y por qué. `main` y el tag ya están subidos: no se
  reescriben ni se fuerza nada; el arreglo va en una rama nueva, cuando el
  usuario lo pida.
- **Si pasa**: la web (`gh api repos/{owner}/{repo}/pages --jq .html_url`)
  responde, y su JS lleva la versión nueva (`curl` del `index.html`, y en el
  `assets/index-*.js` que enlaza, `v<X>`).

## 7. El resumen

Al usuario, corto:

- **La versión** y su enlace a la web.
- **La PR** (enlace), el commit del merge y el tag.
- **El despliegue**: el enlace a la ejecución, cuánto tardó y si la web ya
  sirve la versión nueva.
- **Qué trae**, en dos o tres líneas, sacado del changelog.
- **Lo que queda**: si las fichas o `estado.md` piden algo después del
  despliegue (probar en un móvil, por ejemplo), y que la rama sigue existiendo.
