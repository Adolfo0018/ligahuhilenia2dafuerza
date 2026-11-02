# Liga Huhileña · Segunda Fuerza

App web para seguir la liga: **Partidos**, **Clasificación** y **Estadísticas**, para la Liga y la Copa. El documento funcional y el plan por fases están en [docs/documento-funcional-mvp.md](docs/documento-funcional-mvp.md).

## Estado

**Fase 1 — Vista pública con datos de ejemplo.** Los datos se generan en `src/data/ejemplo.ts` con una semilla fija, así que salen iguales en cada recarga:

- **Liga · Apertura 2026** (en curso): 13 equipos, jornada 9 de 13. Incluye un partido por default, uno aplazado, uno en revisión, suspendidos y una sanción.
- **Copa · Primavera 2026** (terminada): 14 equipos y la liguilla completa, con una final que se define en penales.

La tabla, la liguilla y las estadísticas ya se calculan a partir de los partidos (`src/lib/`). En la fase 2 los datos vendrán de Firestore.

## Cómo correrla

```bash
npm install
npm run dev
```

`npm run build` revisa los tipos y genera `dist/`, que es lo que publica Netlify.

## Personalizar

El nombre, la división, el logo (`public/img/logo.jpg`) y los colores de la liga están en `src/data/liga.json`.
