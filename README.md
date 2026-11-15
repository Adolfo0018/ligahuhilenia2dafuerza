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
| `torneos` | Un documento por torneo con sus equipos, jugadores, partidos, resultados y la publicidad de cada jornada y ronda de liguilla (`anuncios`: negocio, logo, mensaje, enlace, vigencia y si está publicada) | Solo el administrador; todos pueden leer |
| `usuarios` | Un documento por cuenta, con el **UID** de Authentication como id y el campo `rol` (`admin`, `delegado` o `pendiente`) | El delegado crea la suya como `pendiente` al registrarse; el administrador le asigna equipo desde el panel. El rol `admin` solo se da a mano en la consola |
| `capturas` | Lo que captura cada delegado de su equipo en un partido | El delegado de ese equipo, hasta que se publica el resultado |
| `solicitudes` | Altas y bajas de jugadores pedidas por los delegados | El delegado las crea; el administrador las aprueba o rechaza |
| `envivo` | Marcador en vivo de los partidos que se están jugando (uno por partido): estado, inicio y goles de cada equipo. Se borra al publicar el resultado | Cualquiera de los dos delegados del partido marca inicio, medio tiempo y final, y cada uno sus goles; el administrador todo |
| `cobros` | Un documento por torneo (con el id del torneo) con el importe acordado en MXN y si está pagado cada anuncio | Solo el administrador lee y escribe; el público no tiene acceso |
| `configuracion` | Un solo documento, `sitio`, con las secciones del sitio público que el administrador ocultó (pestaña **Sitio** del panel) | Solo el administrador; todos pueden leer |

### Delegados

Cada delegado entra a `/admin`, elige **Soy delegado: crear cuenta** y llena su nombre, correo, contraseña y equipo. El administrador ve la cuenta en **Pendientes** y le da acceso. Desde su panel, el delegado captura los goles, asistencias y tarjetas de su equipo en cada partido jugado y pide altas y bajas de jugadores. El administrador revisa y publica.

### Publicidad por jornada y por liguilla

En el panel, pestaña **Publicidad**: elige la jornada o la ronda de liguilla (cuartos, semifinales o final) y ve si el espacio de **patrocinador oficial** está libre u ocupado y qué **anuncios regulares** tiene. Cada anuncio se crea como borrador (negocio, tipo, logo, mensaje, enlace, vigencia, importe y estado de pago), se previsualiza y se publica aparte: marcar "Pagado" no lo publica. Solo se ven en el sitio los publicados dentro de su vigencia; el oficial va debajo del título de la jornada o de la ronda y los regulares después de sus partidos. Cada ronda de liguilla es un espacio propio (la final se destaca un poco más) y se puede vender antes de generar la ronda: aparece cuando la ronda tiene partidos. Cada jornada o ronda solo puede tener un patrocinador oficial (se valida en una transacción, aunque dos administradores guarden a la vez). "Usar en otra jornada o ronda" crea una copia como borrador con su propia vigencia y su pago pendiente.

Los logos son archivos WebP en [src/assets/publicidad](src/assets/publicidad/LEEME.md); agregar uno requiere desplegar. La publicidad no suma lecturas al sitio: viaja dentro del documento del torneo que ya se lee.

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
