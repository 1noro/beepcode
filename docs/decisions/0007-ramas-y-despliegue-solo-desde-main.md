# ADR 0007 — Ramas de desarrollo, y solo main se despliega

Estado: aceptada (2026-11-20, por el usuario); cambia el CI del ADR 0004

## Contexto

En F0 había dos workflows: `ci.yml`, que pasaba `make ci` en cada push y PR
de cualquier rama, y `deploy.yml`, que en cada push a `main` volvía a pasar
`make ci` y desplegaba. Cada push a `main` gastaba dos ejecuciones, y cada
push a una rama, otra. El usuario no quiere gastar ejecuciones de GitHub
Actions en lo que no se publica.

## Decisión

- **Solo `main` se despliega, y es lo único que ejecuta GitHub Actions**: un
  solo workflow, `deploy.yml`, en cada push a `main` (`make ci`, el build y
  Pages), y a mano (`workflow_dispatch`). **`ci.yml` desaparece**: ni las
  ramas ni los PR ejecutan nada.
- **Un push a `main` que solo toca documentación no despliega**
  (`paths-ignore`: los `.md`, `docs/`, los comandos de los agentes, los hooks
  y las licencias).
- **En `main` no se desarrolla.** Cada desarrollo va en una **rama
  `<tipo>/<slug>`** (`feat/f1-nucleo`, `fix/…`, `docs/…`, `ci/…`) que acaba en
  `main`. **Una rama puede llevar más de un desarrollo a la vez.**
- **La verificación de una rama es `make ci` en local**, antes de llevarla a
  `main`.
- **A `main` se llega con `git merge --no-ff`** desde la rama, con `make ci`
  en verde en ella, y solo cuando lo pide el usuario; el push de `main` es el
  despliegue.

## Razones

- Una ejecución por despliegue, y ninguna por trabajo sin terminar.
- `make ci` corre igual en local que en Actions (ADR 0002 y 0004): lo que pasa
  en la rama pasa en `main`.
- El merge sin fast-forward deja en el historial de `main` qué trajo cada
  rama.

## Consecuencias

- **Si alguien lleva a `main` una rama sin `make ci` en verde, el despliegue
  falla en Actions** (pasa `make ci` antes de construir): no se publica nada
  roto, pero se ve tarde. Por eso `make ci` en local es obligatorio antes del
  merge.
- Un PR en GitHub no tiene comprobaciones automáticas: si se usan, se revisa
  con `make ci` en local.
- El repositorio es público, y en los repositorios públicos los runners
  estándar de GitHub no gastan minutos de pago; aun así se ejecuta solo lo que
  se publica.

## 2026-11-21 — Con PR, y el tag en el mismo push

A petición del usuario, se llega a `main` con la rutina `/desplegar`
([`desplegar.md`](../agentes/desplegar.md)), que abre una PR por cada rama.
**El merge sigue siendo local** (`git merge --no-ff`), no el botón de GitHub,
y se sube con el tag en el mismo push (`git push --atomic origin main
v<X>`): el build saca la versión de `git describe`, y un tag que llegara
después del push de `main` dejaría la app publicada con la versión de antes
más los commits encima. GitHub da la PR por mergeada al ver sus commits en
`main`. Las PR siguen sin comprobaciones automáticas: `make ci` en local.
