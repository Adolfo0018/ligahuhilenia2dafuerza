# Liga Huhileña · Segunda Fuerza

App web para seguir la liga: **Partidos**, **Clasificación** y **Estadísticas**, para la Liga y la Copa. El documento funcional y el plan por fases están en [docs/documento-funcional-mvp.md](docs/documento-funcional-mvp.md).

## Estado

**Fase 1 — Vista pública con datos de ejemplo.** Los datos se generan en `src/data/ejemplo.ts` con una semilla fija, así que salen iguales en cada recarga:

- **Liga · Apertura 2026** (en curso): 13 equipos, jornada 9 de 13. Incluye un partido por default, uno aplazado, uno en revisión, suspendidos y una sanción.
- **Copa · Primavera 2026** (terminada): 14 equipos y la liguilla completa, con una final que se define en penales.

La tabla, la liguilla y las estadísticas ya se calculan a partir de los partidos (`src/lib/`). En la fase 2 los datos vendrán de Firestore.

**Fase 2 — Firebase y panel del administrador** (en `/admin`): torneos, equipos, jugadores, partidos y captura de resultados. Mientras `src/lib/firebase.ts` no tenga la configuración del proyecto, el sitio sigue mostrando los datos de ejemplo.

## Firebase

| Colección | Qué guarda | Quién escribe |
|---|---|---|
| `torneos` | Un documento por torneo con sus equipos, jugadores, partidos y resultados | Solo el administrador; todos pueden leer |
| `usuarios` | Un documento por cuenta con permisos, con el **UID** de Authentication como id y el campo `rol` | Solo a mano desde la consola |

### Publicar las reglas

1. Consola de Firebase → **Firestore → Reglas**.
2. Pega el contenido de [firestore.rules](firestore.rules) y da clic en **Publicar**.

### Dar de alta al administrador

1. **Authentication → Usuarios → Agregar usuario**: correo y contraseña. Copia el **UID** que aparece en la lista.
2. **Firestore → Datos → Iniciar colección**:
   - ID de la colección: `usuarios`
   - ID del documento: el **UID** copiado
   - Campo `rol` (string) con el valor `admin`

Para quitarle el acceso, borra su documento en `usuarios`.

## Cómo correrla

```bash
npm install
npm run dev
```

`npm run build` revisa los tipos y genera `dist/`, que es lo que publica Netlify.

## Personalizar

El nombre, la división, el logo (`public/img/logo.jpg`) y los colores de la liga están en `src/data/liga.json`.
