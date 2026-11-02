# Documento funcional: App de liga de fútbol local (MVP)

- **Estado:** Listo para estimación
- **Versión:** 0.7
- **Fecha:** 2026-11-02 (v0.2: se resuelven P-001, P-002, P-003, P-007 y P-012; v0.3: se resuelven P-017 a P-021 y se adopta el estándar de la Liga MX; v0.4: alerta de captura faltante y se confirman SUP-001 y SUP-003; v0.5: final con tiempo extra y penales, y se validan todos los supuestos; v0.6: plazo de captura, sanción opcional y captura de la final por los delegados; v0.7: sanciones públicas y cierre de todas las preguntas menores con valores por defecto)
- **Solicitante / área:** Usuario solicitante (proyecto personal)
- **Responsable de análisis:** Claude (asistente de levantamiento)
- **Fuentes consultadas:** ver sección 20

## 1. Resumen ejecutivo
Se quiere una app web para seguir una **liga de fútbol local** entre amigos. La idea viene del widget de la Liga MX que muestra Bing, del que se toman tres secciones: **Partidos**, **Clasificación** y **Estadísticas**.

Hay dos competencias, cada una con **13 a 20 equipos**: una **liga** y una **copa**. No se juegan al mismo tiempo: cuando termina la liga empieza la copa, y así sucesivamente. En las dos se juega una fase regular de todos contra todos **a una vuelta** y después una **liguilla de 8 equipos a ida y vuelta**.

Los datos no vienen de un servicio externo, los captura la propia liga:
- El **administrador** da de alta las competencias, los equipos y el calendario, y publica los resultados.
- El **delegado** de cada equipo registra a sus jugadores y, después de cada partido, captura los goles, las asistencias y las tarjetas de su equipo.
- Cualquier persona consulta la app **sin iniciar sesión**.

## 2. Contexto previo
No se encontró contexto previo sobre esta iniciativa. En `Proyectos/` hay otros proyectos (menu-qr, paquetes-turisticos y otros), pero ninguno trata de fútbol ni de ligas. De menu-qr se toman el stack y el formato de este documento.

**Alcance de la investigación:**
- **Local:** `Proyectos/` y `Proyectos/Prueba/`. Se buscó "liga", "futbol", "fútbol" y "torneo" en el contenido de los archivos `.md`, y no hubo coincidencias relevantes. No existe un `CLAUDE.md`.
- **Web:** se abrió en el navegador el enlace de búsqueda que compartió el solicitante (F-01).
- **Sin revisar:** servicios externos en la nube, porque no aplican a este proyecto personal (ver 20.2).

### 2.1 Información existente
Todos los datos de esta tabla siguen vigentes.

| Tema | Dato o decisión | Categoría | Fuente |
|---|---|---|---|
| Referencia visual | El widget de Liga MX en Bing tiene las pestañas Partidos, Noticias, Clasificación y Estadísticas. Se toman todas menos Noticias | Confirmado por el usuario | F-01, ENT-01 |
| Tipo de liga | Liga local, para uso personal y de amigos, sin fines comerciales | Confirmado por el usuario | ENT-01 |
| Origen de datos | Los captura la propia liga; no hay API externa | Confirmado por el usuario | ENT-01 |
| Stack | El mismo que menu-qr: React + Vite + TypeScript en Netlify, con Firebase (Firestore y Auth) | Confirmado por el usuario | ENT-01, F-02 |
| Competencias | Una liga y una copa. La copa tiene la misma estructura que la liga y su **inscripción es aparte**. No son simultáneas: al terminar la liga empieza la copa, y así sucesivamente | Confirmado por el usuario | ENT-01, ENT-02 |
| Formato | Fase regular de todos contra todos a una vuelta y después liguilla de 8 equipos a ida y vuelta, con cruces 1-8, 2-7, 3-6 y 4-5 y reacomodo en semifinales | Confirmado por el usuario | ENT-01, ENT-02 |
| Tamaño | De 13 a 20 equipos por competencia | Confirmado por el usuario | ENT-01 |
| Puntos | Victoria 3, empate 1, derrota 0 | Confirmado por el usuario | ENT-01 |
| Desempate en la tabla | Por goles, con el criterio estándar de la Liga MX (RN-002) | Confirmado por el usuario | ENT-02, ENT-03 |
| Columnas de la tabla | Juegos, Ganados, Empatados, Perdidos, Puntos a favor, Puntos en contra, Diferencia y Puntos | Confirmado por el usuario | ENT-02, ENT-03 |
| Historial | Cada torneo empieza y termina. Se conservan al menos el torneo actual y el anterior | Confirmado por el usuario | ENT-03 |
| Captura faltante | Cada delegado tiene un plazo para capturar y, si no lo cumple, la app alerta al administrador. El administrador puede registrar una sanción, pero la app no bloquea nada | Confirmado por el usuario | ENT-04, ENT-06 |
| Captura de la final | Cada delegado captura todo lo de su equipo, incluidos el tiempo extra y los penales. El administrador solo verifica y aprueba | Confirmado por el usuario | ENT-06 |
| Acceso | La consulta es pública y no requiere iniciar sesión. Cada equipo tiene un solo delegado | Confirmado por el usuario | ENT-04 |
| Empate en el global | Avanza el equipo mejor colocado en la fase regular, excepto en la final: ahí se juega tiempo extra y, si sigue el empate, penales | Confirmado por el usuario | ENT-01, ENT-05 |
| Jugadores entre torneos | Un jugador puede cambiar de equipo de un torneo a otro, pero dentro del mismo torneo solo juega en un equipo | Confirmado por el usuario | ENT-05 |
| Captura del partido | Cada delegado captura los goles, las asistencias y las tarjetas **de su propio equipo**. El marcador sale de sumar las dos capturas y el administrador lo revisa antes de publicarlo | Confirmado por el usuario | ENT-01 |
| Planteles | El delegado da de alta a sus jugadores y el administrador los aprueba | Confirmado por el usuario | ENT-01 |
| Calendario | Hay un generador automático y también se pueden capturar partidos a mano | Confirmado por el usuario | ENT-01 |
| Suspensiones | La app cuenta las tarjetas. El administrador decide cuántos partidos dura cada suspensión, y la app muestra quién no puede jugar la siguiente jornada. Si se captura un evento de un jugador suspendido, la app solo avisa. Dos amarillas en un partido equivalen a una roja. Las suspensiones pendientes se eliminan al terminar el torneo | Confirmado por el usuario | ENT-01, ENT-02, ENT-03 |
| Resultado administrativo | Se registra como victoria 2-0. Los motivos son varios: el equipo no se presentó, no traía credenciales, el campo no estaba en condiciones, entre otros | Confirmado por el usuario | ENT-01 |
| Estadísticas | Goleadores, asistencias, tarjetas y estadísticas por equipo | Confirmado por el usuario | ENT-01 |

### 2.2 Requerimientos relacionados
No hay. Es un proyecto nuevo e independiente de menu-qr; solo comparte el stack.

### 2.3 Contradicciones detectadas
Ninguna.

## 3. Contexto y problema
- **Situación actual:** no se conoce cómo lleva hoy la liga sus resultados y su tabla (P-015).
- **Oportunidad:** que jugadores y aficionados consulten desde el celular el calendario, los resultados, la tabla y las estadísticas, igual que en una liga profesional.
- **Resultado esperado:** la información de la liga está en un solo lugar, se actualiza sola al publicar cada resultado y el administrador ya no tiene que calcular la tabla a mano.

## 4. Objetivos y señales de éxito
- **Objetivos:**
  1. Publicar el calendario y los resultados de las dos competencias.
  2. Calcular la tabla y la liguilla de forma automática.
  3. Repartir la captura entre los delegados sin perder el control del administrador.
- **Cómo se comprobará el éxito:** se juega una jornada real con todas sus capturas hechas por los delegados, el administrador la publica y la tabla queda igual a como se calcularía a mano.
- **Métricas confirmadas:** ninguna todavía.

## 5. Actores y permisos
| Actor | Responsabilidad | Permisos | Fuente |
|---|---|---|---|
| Visitante | Consultar partidos, tabla y estadísticas | Solo lectura y sin iniciar sesión | ENT-04 |
| Delegado | Representa a su equipo. Hay uno solo por equipo | Inicia sesión. Administra el plantel de su equipo, con aprobación del administrador. Captura los goles, las asistencias y las tarjetas de su equipo en los partidos que jugó. No puede ver ni editar la captura del rival, ni cambiar un resultado ya publicado | ENT-01 |
| Administrador | Organiza la liga | Todo lo demás: competencias, equipos, delegados, calendario, aprobación de jugadores, revisión y publicación de resultados, resultados administrativos, suspensiones y liguilla. Puede corregir cualquier captura y recibe alertas de las capturas que faltan | ENT-01, ENT-04 |

## 6. Alcance
### Incluido
- Vista pública con tres secciones (Partidos, Clasificación y Estadísticas) y un selector para cambiar entre Liga y Copa.
- Panel del administrador y panel del delegado.
- Generador automático del calendario de todos contra todos, además de la captura manual de partidos.
- Liguilla de 8 equipos a ida y vuelta, con cuadro de llaves y marcador global.
- Conteo de tarjetas y lista de suspendidos.
- Resultado administrativo 2-0 con su motivo.

### Excluido (MVP)
- Noticias, videos y comentarios.
- Datos de la Liga MX real o de cualquier API externa.
- Estadísticas que no se capturan en una liga local: posesión, tiros, minutos jugados y alineaciones.
- Marcador en vivo durante el partido (P-016).
- Cobro de inscripciones, arbitrajes o multas.
- Generación o impresión de credenciales (P-010).
- App nativa en tiendas de aplicaciones.

### Dependencias
- **DEP-001:** un proyecto de Firebase nuevo o reutilizado (P-013), en plan Spark.
- **DEP-002:** un sitio nuevo en Netlify y un repositorio en GitHub.
- **DEP-003:** la lista de equipos, delegados y canchas de la liga, para las pruebas con datos reales.

## 7. Proceso actual
No se conoce (P-015).

## 8. Proceso esperado
1. Al terminar la competencia anterior, el administrador crea la siguiente (Liga y Copa se van alternando) y su torneo (por ejemplo, "Apertura 2026").
2. Inscribe los equipos en esa competencia y asigna un delegado a cada uno.
3. Cada delegado da de alta a sus jugadores y el administrador los aprueba.
4. El administrador genera el calendario de todos contra todos a una vuelta y ajusta la fecha, la hora y la cancha de cada partido. También puede crear o mover partidos a mano.
5. Se juega el partido.
6. Cada delegado captura los goles, las asistencias y las tarjetas de su equipo, eligiendo a sus jugadores aprobados.
7. Cuando ya capturaron los dos delegados, el partido queda **en revisión**. El administrador revisa el marcador que resulta de sumar las dos capturas, lo corrige si hace falta y lo **publica**.
8. Al publicarse, la tabla, las estadísticas y los suspendidos se actualizan.
9. Al terminar la fase regular, el administrador genera la liguilla con los 8 primeros de la tabla.
10. En cada llave se juegan la ida y la vuelta. Avanza quien gane el marcador global, y si el global queda empatado avanza el mejor colocado de la tabla. Así hasta la final, donde un empate en el global se define con tiempo extra y, si sigue, penales.

### Flujos alternativos y excepciones
- **Resultado administrativo:** el administrador indica qué equipo es el responsable y escribe el motivo. El rival gana 2-0 (RN-007).
- **Partido aplazado:** el administrador marca el partido como aplazado y después lo reprograma (P-011).
- **Falta una captura:** cada delegado tiene un plazo para capturar después del partido (RN-017). Cuando vence, la app alerta al administrador (RF-022). El administrador puede capturar en lugar del delegado y, si quiere, registrar una sanción al equipo (RF-024). La sanción es opcional y la app no bloquea al delegado.
- **Jugador no aprobado:** no aparece en la lista para capturar goles ni tarjetas.
- **Jugador suspendido:** se muestra como suspendido mientras no cumpla sus partidos. Si un delegado le captura un gol o una tarjeta, la app avisa pero no lo impide. Propuesta: el aviso también se le muestra al administrador en la revisión (RN-010).
- **Doble amarilla:** si un jugador recibe dos amarillas en el mismo partido, la app las registra como una roja (RN-014).
- **Error después de publicar:** solo el administrador puede corregir el resultado, y la tabla se recalcula.

## 9. Requisitos funcionales
| ID | Requisito | Prioridad | Fuente | Criterios | Estado |
|---|---|---|---|---|---|
| RF-001 | La vista pública debe abrir en la competencia en curso (Liga o Copa) y permitir consultar el torneo anterior. Se conservan al menos el torneo actual y el anterior. | Alta | ENT-01 | CA-001 | Confirmado |
| RF-002 | **Partidos:** el sistema debe listar los partidos por jornada con fecha, hora, cancha, equipos y estado (programado, aplazado, finalizado o resultado administrativo). Solo muestra el marcador de los partidos publicados. | Alta | ENT-01, F-01 | CA-001 | Confirmado |
| RF-003 | El detalle de un partido debe mostrar los goles con su autor y asistencia, y las tarjetas de cada equipo. | Media | Propuesta | CA-002 | Propuesta |
| RF-004 | **Clasificación:** el sistema debe calcular la tabla de la fase regular con las columnas Juegos, Ganados, Empatados, Perdidos, Puntos a favor, Puntos en contra, Diferencia y Puntos, y señalar a los 8 equipos que van a la liguilla. | Alta | ENT-01, F-01 | CA-003, CA-004 | Confirmado |
| RF-005 | El sistema debe mostrar el cuadro de la liguilla con la ida, la vuelta, el marcador global y el equipo que avanza en cada llave. En la final también muestra el tiempo extra y los penales, si los hubo, y al campeón. | Alta | ENT-01 | CA-005 | Confirmado |
| RF-006 | **Estadísticas:** el sistema debe mostrar la tabla de goleadores de cada competencia. | Alta | ENT-01 | CA-002 | Confirmado |
| RF-007 | El sistema debe mostrar la tabla de asistencias. | Alta | ENT-01 | CA-002 | Confirmado |
| RF-008 | El sistema debe mostrar las tarjetas amarillas y rojas por jugador y por equipo. | Alta | ENT-01 | CA-008 | Confirmado |
| RF-009 | El sistema debe mostrar estadísticas por equipo: goles a favor, goles en contra, diferencia, racha de los últimos 5 partidos, partidos sin recibir gol y tarjetas. | Media | ENT-01, decisión por defecto (P-008) | CA-003 | Confirmado |
| RF-010 | El sistema debe mostrar la lista de jugadores suspendidos para la siguiente jornada, con el número de partidos que les faltan. | Alta | ENT-01 | CA-008 | Confirmado |
| RF-011 | El delegado y el administrador deben iniciar sesión con correo y contraseña. | Alta | Inferencia (como en F-02) | CA-009 | Pendiente de confirmar |
| RF-012 | El delegado debe poder dar de alta y editar a los jugadores de su equipo. Cada cambio queda pendiente hasta que el administrador lo aprueba. | Alta | ENT-01 | CA-006 | Confirmado |
| RF-013 | El delegado debe poder capturar los goles (con asistencia opcional) y las tarjetas de su equipo en un partido ya jugado y aún no publicado. Si el jugador está suspendido, la app avisa pero permite guardar. | Alta | ENT-01, ENT-02 | CA-002, CA-008, CA-009, CA-011 | Confirmado |
| RF-014 | El administrador debe poder crear competencias y torneos, inscribir equipos y asignarles delegados. | Alta | ENT-01 | CA-001 | Confirmado |
| RF-015 | El administrador debe poder generar de forma automática el calendario de todos contra todos a una vuelta de un torneo. | Alta | ENT-01 | CA-010 | Confirmado |
| RF-016 | El administrador debe poder crear, editar, aplazar y reprogramar partidos a mano. | Alta | ENT-01 | CA-010 | Confirmado |
| RF-017 | El administrador debe poder revisar, corregir y publicar el resultado de un partido, y también capturar en lugar de un delegado. | Alta | ENT-01 | CA-002 | Confirmado |
| RF-018 | El administrador debe poder registrar un resultado administrativo indicando el equipo responsable y el motivo. | Alta | ENT-01 | CA-007 | Confirmado |
| RF-019 | El administrador debe poder asignar a un jugador una suspensión de N partidos. | Alta | ENT-01 | CA-008 | Confirmado |
| RF-020 | El administrador debe poder generar la liguilla con los 8 primeros de la tabla al cerrar la fase regular. | Alta | ENT-01 | CA-005 | Confirmado |
| RF-021 | La vista pública debe mostrar la página de cada equipo con su plantel aprobado y sus resultados. | Baja | Propuesta | — | Propuesta |
| RF-022 | El panel del administrador debe alertar de los partidos cuyo plazo de captura venció sin la captura de uno o de los dos delegados, indicando qué equipo no ha capturado. La alerta desaparece cuando se completa la captura o cuando el administrador captura en su lugar. | Alta | ENT-04, ENT-06 | CA-013 | Confirmado. Que la alerta aparezca dentro del panel es propuesta |
| RF-023 | En la vuelta de la final, cada delegado debe poder capturar los goles del tiempo extra de su equipo y cuántos penales anotó su equipo en la tanda. El administrador los verifica y aprueba. | Alta | ENT-05, ENT-06 | CA-014 | Confirmado |
| RF-024 | El administrador debe poder registrar una sanción a un equipo por capturar fuera de plazo, con una descripción libre. La sanción queda registrada y se ve en el panel y en la vista pública, en Estadísticas junto a los suspendidos. No cambia la tabla ni bloquea al delegado. | Media | ENT-06, ENT-07 | CA-015 | Confirmado |
| RF-025 | El administrador debe poder configurar el plazo de captura de cada torneo. Por defecto es de 24 horas después de la hora del partido. | Media | ENT-06, decisión por defecto (P-004) | CA-013 | Confirmado |

## 10. Reglas de negocio
| ID | Regla | Condición | Resultado | Fuente | Estado |
|---|---|---|---|---|---|
| RN-001 | Puntos | Partido publicado de fase regular | Victoria 3, empate 1, derrota 0 | ENT-01 | Confirmado |
| RN-002 | Desempate en la tabla | Dos o más equipos empatados en puntos | Estándar de la Liga MX, en este orden: 1) diferencia de goles, 2) goles a favor, 3) resultado entre los equipos empatados, 4) goles a favor como visitante, 5) juego limpio (menos tarjetas), 6) sorteo que hace el administrador | ENT-02, ENT-03, F-03 | Confirmado |
| RN-003 | Clasificación a la liguilla | Termina la fase regular | Pasan los 8 primeros de la tabla | ENT-01 | Confirmado |
| RN-004 | Llaves de la liguilla | Cada ronda | Se juega ida y vuelta y avanza quien gane el global. Si el global empata, avanza el mejor colocado de la fase regular. En la final no aplica: ver RN-015 | ENT-01, ENT-05 | Confirmado |
| RN-005 | Cruces de la liguilla | Al generar la liguilla | Cuartos 1-8, 2-7, 3-6 y 4-5; en semifinales se reacomoda para que el mejor sembrado juegue contra el peor que siga vivo | ENT-02 | Confirmado |
| RN-006 | Origen del marcador | Partido capturado | Los goles de cada equipo son los que capturó su propio delegado, incluidos los autogoles a favor (P-005) | ENT-01 | Confirmado |
| RN-007 | Resultado administrativo | El administrador lo registra con su motivo | El rival del equipo responsable gana 2-0. Esos goles cuentan para la tabla pero no para ningún jugador | ENT-01, ENT-05 | Confirmado |
| RN-008 | Solo cuenta lo publicado | Partido capturado pero sin publicar | No afecta la tabla, las estadísticas ni las suspensiones | ENT-01 | Confirmado |
| RN-009 | Solo jugadores aprobados | Captura de goles, asistencias o tarjetas | Solo se pueden elegir jugadores aprobados de ese equipo | ENT-01 | Confirmado |
| RN-010 | Suspensión | El administrador asigna N partidos | El jugador aparece como suspendido hasta que su equipo juegue N partidos publicados en ese torneo. Si se le captura un evento mientras está suspendido, la app solo avisa. Al terminar el torneo, las suspensiones pendientes se eliminan | ENT-01, ENT-02, ENT-03 | Confirmado |
| RN-011 | Competencias separadas | Liga y Copa | Cada competencia tiene sus propios equipos, planteles, tabla y estadísticas. No se juegan al mismo tiempo: al terminar una empieza la otra | ENT-01, ENT-02 | Confirmado |
| RN-012 | Generador de calendario | Al generar la fase regular | Todos contra todos a una vuelta: cada equipo enfrenta una vez a cada rival. Con un número impar de equipos, en cada jornada descansa uno distinto (13 equipos = 13 jornadas; 20 equipos = 19 jornadas) | ENT-02 | Confirmado |
| RN-013 | Permisos del delegado | Partido publicado | El delegado ya no puede modificar la captura | Propuesta | Propuesta |
| RN-014 | Doble amarilla | Un jugador recibe dos amarillas en el mismo partido | Cuenta como una roja. En las estadísticas el jugador suma 1 amarilla y 1 roja, como en la Liga MX | ENT-02, ENT-03 | Confirmado |
| RN-015 | Final empatada | El global de la final queda empatado al terminar la vuelta | Se juega tiempo extra y, si sigue el empate, penales. Los goles del tiempo extra cuentan para el global y para las estadísticas; los de la tanda de penales no, como en la Liga MX. Cada delegado captura los goles del tiempo extra y los penales anotados por su equipo, y el administrador verifica y aprueba | ENT-05, ENT-06, F-03 | Confirmado (el conteo en estadísticas sigue el estándar Liga MX) |
| RN-016 | Un equipo por torneo | Al aprobar un jugador | Se rechaza si ya está aprobado en otro equipo del mismo torneo. En un torneo distinto puede estar en otro equipo | ENT-05 | Confirmado |
| RN-017 | Plazo de captura | Vence el plazo después de la hora del partido y falta la captura de algún delegado | Se alerta al administrador. El delegado todavía puede capturar mientras el partido no esté publicado, porque la captura tardía no se bloquea | ENT-06 | Confirmado (duración del plazo: P-004) |

## 11. Datos e información
- **Competencia:** tipo (Liga o Copa), nombre del torneo y estado (fase regular, liguilla o terminado). Solo hay una en curso a la vez.
- **Equipo:** nombre, escudo opcional e inscripción por competencia con su delegado.
- **Jugador:** nombre, número y estado (pendiente, aprobado o rechazado). Faltan por definir otros datos (P-006).
- **Partido:** competencia, fase (regular o liguilla), jornada o ronda, ida o vuelta, fecha, hora, cancha, equipos, estado y motivo del resultado administrativo. Solo en la final: resultado de la tanda de penales.
- **Eventos del partido:** gol (autor y asistencia opcional, o autogol, y si fue en tiempo extra), tarjeta amarilla y tarjeta roja. Cada evento guarda qué delegado lo capturó.
- **Suspensión:** jugador, competencia, número de partidos, partidos cumplidos y motivo.
- **Cálculo y almacenamiento:** la tabla y las estadísticas se calculan a partir de los partidos publicados. Si hace falta por rendimiento, pueden guardarse ya calculadas.
- **Auditoría:** cada partido guarda quién capturó, quién publicó y quién corrigió, con su fecha.
- **Privacidad:** en público solo se ven el nombre y el número de cada jugador. Los correos de los delegados no son públicos.

## 12. Integraciones
| Sistema | Propósito | Dirección / frecuencia | Errores y recuperación |
|---|---|---|---|
| Firebase Firestore | Guardar los datos y leerlos en tiempo real | Lectura pública; escritura de delegados y administrador | Mensaje de error y reintento al guardar |
| Firebase Auth | Inicio de sesión de delegados y administrador | Al iniciar sesión | Mensaje de credenciales inválidas |
| Netlify | Publicar la app | Cada vez que se sube un cambio a la rama main | — |

## 13. Requisitos no funcionales
| ID | Categoría | Requisito | Validación | Estado |
|---|---|---|---|---|
| RNF-001 | Usabilidad | La app está diseñada primero para celular y no tiene desplazamiento horizontal a 375 px de ancho | Prueba en celular y en el emulador del navegador | Propuesta |
| RNF-002 | Seguridad | Las reglas de Firestore solo dejan a un delegado escribir en su equipo y en sus partidos, y la publicación queda reservada al administrador | Pruebas de las reglas | Propuesta |
| RNF-003 | Costo | Todo funciona dentro del plan gratuito de Firebase (Spark) y de Netlify | Revisar el consumo con datos de una temporada | Propuesta |
| RNF-004 | Actualización | Al publicarse un resultado, la vista pública se actualiza sin recargar la página | Prueba con dos dispositivos | Propuesta |
| RNF-005 | Seguridad | Nunca se publica Firebase sin reglas, igual que en menu-qr | Revisión antes de cada despliegue | Propuesta (F-02) |

## 14. Criterios de aceptación
### CA-001 — Cambio de competencia
- **Dado:** la Liga y la Copa tienen partidos programados.
- **Cuando:** el visitante elige "Copa".
- **Entonces:** Partidos, Clasificación y Estadísticas muestran solo los datos de la Copa.

### CA-002 — Captura y publicación de un partido
- **Dado:** el partido A vs B ya se jugó.
- **Cuando:** el delegado de A captura 2 goles (uno con asistencia), el delegado de B captura 1 gol y una amarilla, y el administrador publica.
- **Entonces:** el partido se ve como A 2-1 B; los goleadores, las asistencias y las tarjetas reflejan esos eventos; antes de publicarse, nada de eso aparecía en público.

### CA-003 — Cálculo de la tabla
- **Dado:** A le ganó 2-1 a B y B empató 0-0 con C, ambos partidos publicados.
- **Cuando:** se consulta la Clasificación.
- **Entonces:**
  - A: 1 juego, 1 ganado, 2 a favor, 1 en contra y 3 puntos.
  - B: 2 juegos, 1 empatado, 1 perdido, 1 a favor, 2 en contra y 1 punto.
  - C: 1 juego, 1 empatado, 0 a favor, 0 en contra y 1 punto.
  - C queda arriba de B por goles (RN-002).

### CA-004 — Zona de liguilla
- **Dado:** un torneo con 14 equipos.
- **Cuando:** se consulta la tabla.
- **Entonces:** los lugares 1 a 8 aparecen marcados como zona de liguilla.

### CA-005 — Empate en el global
- **Dado:** en cuartos, el 2.º lugar empata 1-1 en la ida y 0-0 en la vuelta contra el 7.º.
- **Cuando:** se publica la vuelta.
- **Entonces:** el cuadro muestra un global de 1-1 y avanza el 2.º lugar.

### CA-006 — Aprobación de un jugador
- **Dado:** un delegado da de alta a un jugador.
- **Cuando:** el administrador todavía no lo aprueba.
- **Entonces:** el jugador no aparece en público ni se puede elegir al capturar; una vez aprobado, sí.

### CA-007 — Resultado administrativo
- **Dado:** el equipo B no trae credenciales.
- **Cuando:** el administrador registra un resultado administrativo con B como responsable y escribe el motivo.
- **Entonces:** A gana 2-0 y suma 3 pts, ningún jugador suma goles y el partido muestra la etiqueta de resultado administrativo con su motivo.

### CA-008 — Suspensión
- **Dado:** un jugador recibe una roja en la jornada 5 y el administrador le asigna 2 partidos de suspensión.
- **Cuando:** se publican las jornadas 6 y 7 de su equipo.
- **Entonces:** el jugador aparece en la lista de suspendidos antes de las jornadas 6 y 7, y ya no aparece antes de la jornada 8. Su roja se cuenta en las estadísticas de tarjetas. Si en la jornada 6 su delegado le captura un gol, la app muestra un aviso pero permite guardarlo.

### CA-009 — Permisos del delegado
- **Dado:** el delegado de A inició sesión.
- **Cuando:** intenta capturar goles del equipo B o editar un partido ya publicado.
- **Entonces:** la app no se lo permite, y las reglas de Firestore también lo rechazan si se intenta escribir directo en la base.

### CA-010 — Generador de calendario
- **Dado:** un torneo con 13 equipos inscritos.
- **Cuando:** el administrador genera el calendario.
- **Entonces:** se generan 13 jornadas, cada equipo enfrenta una vez a cada rival y descansa en una jornada, no se repite ningún partido y el administrador puede editar después la fecha, la hora y la cancha de cada uno.

### CA-011 — Doble amarilla
- **Dado:** un jugador ya tiene una amarilla en el partido.
- **Cuando:** su delegado le captura una segunda amarilla.
- **Entonces:** la app la registra como roja por doble amarilla, en las estadísticas el jugador suma 1 amarilla y 1 roja, y el administrador puede asignarle una suspensión.

### CA-012 — Fin de torneo con suspensión pendiente
- **Dado:** a un jugador le falta 1 partido de suspensión cuando termina la Liga.
- **Cuando:** empieza la Copa.
- **Entonces:** el jugador ya no aparece como suspendido.

### CA-013 — Alerta de captura faltante
- **Dado:** el plazo de captura del partido A vs B ya venció; el delegado de A capturó y el de B no.
- **Cuando:** el administrador entra a su panel.
- **Entonces:** ve una alerta en ese partido que dice que falta la captura de B. Cuando B captura, la alerta desaparece y el partido pasa a "en revisión".

### CA-014 — Final empatada
- **Dado:** en la final, la ida termina 1-0 para el 1.º lugar y la vuelta termina 1-0 para el 3.º lugar en tiempo regular (global 1-1).
- **Cuando:** en el tiempo extra no hay goles, el 3.º gana 5-4 en penales y se publica la vuelta.
- **Entonces:** el campeón es el 3.º lugar y el cuadro muestra el global 1-1 y los penales 5-4. Los penales de la tanda no suman en goleadores. Si el 1.º hubiera anotado en el tiempo extra, ese gol sí contaría para el global y para su autor. Los dos delegados capturaron sus goles y sus penales, y el administrador solo aprobó.

### CA-015 — Sanción opcional por captura tardía
- **Dado:** el delegado de B capturó después de que venció el plazo.
- **Cuando:** el administrador registra una sanción a B con la descripción "captura tardía, jornada 4".
- **Entonces:** la sanción queda registrada y se ve en el panel y en la vista pública, la tabla no cambia y el delegado de B puede seguir capturando con normalidad. Si el administrador no registra ninguna sanción, no pasa nada más.

## 15. Supuestos e inferencias por validar
| ID | Supuesto | Base | Impacto si es incorrecto | Cómo validarlo |
|---|---|---|---|---|
| SUP-001 | La consulta es pública y no requiere iniciar sesión | Es lo habitual en una app de liga | Habría que agregar acceso para los visitantes | **Confirmado** (ENT-04) |
| SUP-002 | En un resultado administrativo, el 2-0 no se le asigna a ningún jugador | Práctica común en ligas | Cambia el conteo de goleadores | **Confirmado** (ENT-05) |
| SUP-003 | Cada equipo tiene un solo delegado por competencia | Respuesta "delegado de cada equipo" | Cambian los permisos y el modelo de datos | **Confirmado** (ENT-04) |
| SUP-004 | El criterio "avanza el mejor de la tabla" también aplica en la final | La respuesta no distinguió por ronda | La final podría definirse en penales | **Descartado**: la final se define con tiempo extra y penales (ENT-05, RN-015) |
| SUP-005 | "Puntos a favor" y "Puntos en contra" son los goles a favor y en contra | Columnas indicadas por el solicitante | Cambia el cálculo de la tabla | **Confirmado** (ENT-05) |
| SUP-006 | Como Liga y Copa no son simultáneas, un jugador puede cambiar de equipo de una competencia a otra, pero dentro de la misma competencia solo juega en un equipo | Competencias alternadas con inscripción aparte | Cambia la validación al aprobar jugadores | **Confirmado** (ENT-05, RN-016) |

## 16. Preguntas y decisiones
No quedan preguntas abiertas. El 2026-11-02 el solicitante pidió no hacer más rondas por temas menores, así que el analista los cerró con los valores por defecto de esta tabla. Cualquiera se puede cambiar después sin afectar el plan.

### Decisiones por defecto (ajustables)
| ID | Decisión |
|---|---|
| P-004 | El plazo de captura es de **24 horas** después de la hora del partido. El administrador lo puede cambiar en cada torneo (RF-025) |
| P-005 | El autogol lo captura el delegado del equipo beneficiado como "autogol", sin autor. Cuenta para el marcador pero no para los goleadores |
| P-006 | Cada jugador lleva nombre, número y foto opcional. No se piden datos personales como fecha de nacimiento o teléfono |
| P-008 | Las estadísticas por equipo son: goles a favor, goles en contra, diferencia, racha de los últimos 5 partidos, partidos sin recibir gol y tarjetas |
| P-009 | La tabla de goleadores tiene un filtro "Fase regular / Liguilla / Todo". Por defecto muestra la fase regular |
| P-010 | La app no genera credenciales; quedan fuera del alcance |
| P-011 | Un partido aplazado conserva su jornada original y solo cambia de fecha |
| P-013 | Se crea un proyecto de Firebase nuevo, separado de menu-qr |
| P-014 | Mientras no haya nombre, logo ni colores, se usan "Liga Local" y una paleta neutra que se cambia en la configuración |
| P-015 | No se necesita saber cómo llevan hoy los resultados. El torneo actual se carga a mano desde el panel |
| P-016 | El marcador en vivo queda fuera del MVP |

### Preguntas resueltas (2026-11-02)
| ID | Respuesta |
|---|---|
| P-001 | El desempate es por goles, como se acostumbra. Columnas: Juegos, Ganados, Empatados, Perdidos, Puntos a favor, Puntos en contra y Puntos |
| P-002 | La fase regular es a una vuelta |
| P-003 | Cruces 1-8, 2-7, 3-6 y 4-5, con reacomodo en semifinales |
| P-007 | Liga y Copa no son simultáneas: al terminar la liga empieza la copa, y así sucesivamente (ver SUP-006) |
| P-012 | La app solo avisa si se captura un evento de un jugador suspendido. Dos amarillas en un partido equivalen a una roja |
| P-017 | Cada torneo empieza y termina. Se conservan al menos el torneo actual y el anterior |
| P-018 | Las suspensiones pendientes se eliminan al terminar el torneo |
| P-019 | Se usa el estándar de la Liga MX: la doble amarilla cuenta como 1 amarilla y 1 roja |
| P-020 | Se usa el estándar de la Liga MX: después de la diferencia de goles y los goles a favor, sigue el resultado entre ellos, luego los goles como visitante, luego el juego limpio y al final un sorteo |
| P-021 | Se usa el estándar de la Liga MX: la tabla muestra la columna Diferencia |
| P-022 | Cada delegado captura todo lo de su equipo, incluidos el tiempo extra y los penales. El administrador solo verifica y aprueba |
| P-004 | Hay un plazo de captura. La sanción es una opción del administrador, no una restricción automática |
| P-023 | Las sanciones se ven tanto en la vista pública como en el panel del administrador |

## 17. Riesgos
| ID | Riesgo | Probabilidad / impacto | Mitigación |
|---|---|---|---|
| R-001 | Los delegados no capturan a tiempo o capturan mal | Alta / Medio | El administrador revisa antes de publicar y puede capturar en lugar del delegado |
| R-002 | Hay disputas por resultados o sanciones | Media / Medio | Guardar quién capturó, quién publicó y quién corrigió cada partido, con su motivo |
| R-003 | Un delegado intenta modificar los datos de otro equipo | Baja / Alto | Reglas de Firestore por equipo (RNF-002) |
| R-004 | Con 20 equipos hay muchas lecturas en tiempo real | Baja / Bajo | Guardar la tabla ya calculada y leer por competencia |

## 18. Trazabilidad
| Objetivo | Requisitos | Criterios |
|---|---|---|
| Publicar calendario y resultados | RF-001, RF-002, RF-003, RF-015, RF-016, RF-017 | CA-001, CA-002, CA-010 |
| Tabla y liguilla automáticas | RF-004, RF-005, RF-020, RF-023, RN-001 a RN-005, RN-015 | CA-003, CA-004, CA-005, CA-014 |
| Captura repartida con control | RF-011, RF-012, RF-013, RF-017, RF-022, RF-024, RF-025, RN-006, RN-008, RN-009, RN-017 | CA-002, CA-006, CA-009, CA-013, CA-015 |
| Estadísticas y disciplina | RF-006 a RF-010, RF-018, RF-019, RN-007, RN-010 | CA-007, CA-008 |

## 19. Validación y aprobación
- **Revisores:** el solicitante.
- **Comentarios por resolver:** ninguno. Las decisiones por defecto de la sección 16 se pueden ajustar en cualquier fase.
- **Aprobación:** pendiente.

## 20. Fuentes consultadas
### 20.1 Fuentes leídas
| ID | Fuente | Secciones | Fecha | Uso |
|---|---|---|---|---|
| F-01 | Búsqueda "liga mx" en Bing (enlace del solicitante) | Widget "Liga MX, Apertura 2026": Partidos, Noticias, Clasificación y Estadísticas | Consultada el 2026-11-02 | Referencia de secciones y presentación |
| F-02 | `Prueba/menu-qr/docs/documento-funcional-mvp.md` | Estructura y plan por fases | 2026-10-29 | Stack, formato del documento y forma de trabajar por fases |
| ENT-01 | Entrevista con el solicitante | — | 2026-11-02 | Decisiones iniciales confirmadas |
| ENT-02 | Respuestas del solicitante a las preguntas pendientes | — | 2026-11-02 | Resolución de P-001, P-002, P-003, P-007 y P-012 |
| ENT-03 | Respuestas del solicitante a las preguntas pendientes | — | 2026-11-02 | Resolución de P-017 y P-018. Pidió usar el estándar de la Liga MX para P-019, P-020 y P-021 |
| ENT-04 | Respuestas del solicitante a las preguntas pendientes | — | 2026-11-02 | Alerta al administrador por captura faltante (P-004); confirma SUP-001 y SUP-003 |
| ENT-05 | Respuestas del solicitante sobre los supuestos | — | 2026-11-02 | Confirma SUP-002, SUP-005 y SUP-006. Descarta SUP-004: la final se define con tiempo extra y penales |
| ENT-06 | Respuestas del solicitante sobre P-022 y P-004 | — | 2026-11-02 | Los delegados capturan todo, incluida la final. Hay plazo de captura y la sanción es opcional |
| ENT-07 | Respuestas del solicitante sobre P-004 y P-023 | — | 2026-11-02 | Las sanciones se ven en público y en el panel. Pide no hacer más preguntas sobre temas menores: el analista los decide con valores por defecto (sección 16) |
| F-03 | Criterios de la Liga MX para desempate, doble amarilla y columnas de la tabla | Desempate en la tabla general y conteo de tarjetas | Conocimiento general del analista | RN-002, RN-014 y RF-004. No se consultó el reglamento oficial (ver 20.2) |

### 20.2 Fuentes identificadas pero no consultadas
| Fuente | Motivo | Impacto |
|---|---|---|
| Servicios externos en la nube | No aplican a un proyecto personal | Ninguno esperado |
| Reglamento de la liga | No se ha compartido | Podría ajustar algunas decisiones por defecto |
| Reglamento de competencia oficial de la Liga MX | No se descargó; los criterios de F-03 salen de conocimiento general | Conviene confirmar el orden de desempate antes de la fase 1 |

## 21. Recomendación del siguiente paso
Ya no hay preguntas ni supuestos abiertos. El siguiente paso es empezar la fase 1 de la sección 22, que no necesita Firebase.

## 22. Plan por fases (propuesta)
Al terminar cada fase hay algo publicado en Netlify que se puede probar desde el celular, igual que en menu-qr.

| Fase | Qué se entrega | Al terminar se puede… | Tamaño | Requisitos | Criterios |
|---|---|---|---|---|---|
| **1. Vista pública con datos de prueba** | Proyecto React en Netlify. Partidos, Clasificación y Estadísticas con datos de ejemplo guardados en un archivo, y selector entre Liga y Copa. La tabla y las estadísticas ya se calculan a partir de los partidos | Ver y validar el diseño y los cálculos | Mediano | RF-001 a RF-009, RN-001, RN-002, RNF-001 | CA-001, CA-003, CA-004 |
| **2. Firebase y panel del administrador** | Firestore con reglas, inicio de sesión y panel para administrar competencias, equipos, jugadores y partidos a mano. El administrador captura y publica resultados | Llevar la liga completa con un solo administrador | Grande | RF-011, RF-014, RF-016, RF-017, RN-008, RNF-002, RNF-004, RNF-005 | CA-002 |
| **3. Generador de calendario** | Calendario de todos contra todos con descansos y edición posterior | Armar un torneo en minutos | Chico | RF-015, RN-012 | CA-010 |
| **4. Delegados** | Cuentas de delegado, planteles con aprobación, captura por equipo, bandeja "en revisión" del administrador, plazo de captura con alertas y sanción opcional | Repartir la captura entre los delegados | Mediano | RF-012, RF-013, RF-022, RF-024, RF-025, RN-006, RN-009, RN-013, RN-017 | CA-002, CA-006, CA-009, CA-013, CA-015 |
| **5. Disciplina y resultados administrativos** | Suspensiones, lista de suspendidos, resultado administrativo 2-0 con motivo y partidos aplazados | Llevar las sanciones en la app | Mediano | RF-010, RF-018, RF-019, RN-007, RN-010 | CA-007, CA-008 |
| **6. Liguilla** | Generación de las llaves, ida y vuelta, marcador global, desempate por posición, tiempo extra y penales en la final, y cuadro visual | Jugar la fase final | Mediano | RF-005, RF-020, RF-023, RN-003, RN-004, RN-005, RN-015 | CA-005, CA-014 |
| **7. Salida a uso real** | Revisión de reglas, carga del torneo actual, nombre y logo de la liga, y prueba con una jornada real | Usarla con toda la liga | Chico | Todos | Todos |

**Nota:** la Copa no necesita una fase propia. Desde la fase 2 el modelo de datos soporta varias competencias, así que la Copa es otra competencia con su propia inscripción, que empieza cuando termina la Liga.

---
**Nota de integridad:** las secciones marcadas como "Propuesta" o "Pendiente" no han sido aceptadas por el solicitante.
