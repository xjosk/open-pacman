# SPEC 03 — Puerta de la guarida de un solo sentido

> **Estado:** Aprobado
> **Dependencias:** SPEC 01
> **Fecha:** 2026-11-24
> **Objetivo:** Que ningún fantasma liberado pueda volver a entrar a la guaria por la puerta, eliminando el atasco por el que re-entraba persiguiendo a Pac-Man y quedaba oscilando dentro.

## Alcance

**Dentro:**

- `src/js/game.js`: la puerta de la guarida (celda `3`) cuenta como muro para los fantasmas ya liberados — nunca pueden re-entrar, desde (13,11) ni desde (14,11).
- `src/js/game.js`: al marcarse `released` en (13,11), el fantasma decide su primera dirección con la lógica de persecución en ese mismo tic, sin conservar la `dir: 'up'` heredada (que ahí es muro) ni perder un tic.
- Se mantienen intactas las convenciones de SPEC 01: demoras escalonadas (120/240/360 frames), reinicio de demoras tras perder vida, camino scriptado de salida por la columna 13 y Pac-Man sin acceso a la guaria.

**Fuera de alcance (para futuras specs):**

- Salida de la guarida por contadores de dots (sigue por temporizador).
- Modos scatter/chase globales, frightened y power pellets.
- Cambios de geometría de la guarida o del laberinto.
- Ajustar las demoras de salida.

## Modelo de datos

Esta feature no introduce datos nuevos. Reutiliza `released` y `penFrames` tal como los definió SPEC 01. Solo cambian firmas internas de `src/js/game.js`: `isWall`/`canMove` pasan a recibir el actor real (`'pacman'` o el objeto fantasma `g`) para decidir si la puerta bloquea:

```js
// isWall( grid, x, y, actor ) — actor: 'pacman' | objeto fantasma g
// celda 3 (puerta):
//   pacman            → muro     (igual que hoy)
//   g.released true   → muro     (nuevo: un liberado no re-entra)
//   g.released false  → pasable  (el que está saliendo cruza hacia arriba)
```

Convenciones: coordenadas de celda con origen arriba-izquierda; velocidades en celdas/frame; demoras en frames asumiendo 60 tics/s, como el resto del juego.

## Plan de implementación

1. `src/js/game.js`: regla de puerta de un solo sentido — modificar `isWall` para que la celda `3` bloquee a Pac-Man (como hoy) y a todo fantasma con `released === true`; pasar el actor real desde `canMove` y actualizar las llamadas de `decideGhost`/`moveGhost` para enviar `g` en lugar de `'ghost'` (Pac-Man sigue enviando `'pacman'`). Verificación manual: jugar con Pac-Man en la mitad inferior y fantasmas persiguiendo — ninguno baja por la puerta; Pinky, Inky y Clyde siguen saliendo escalonados (la salida scriptada no se rompe).
2. `src/js/game.js`: pulir la liberación en (13,11) — tras marcar `released = true`, no hacer `return`; dejar que el mismo tic continúe hacia la lógica de persecución y elija una dirección válida. Verificación manual: el fantasma que emerge por la puerta gira y avanza de inmediato, sin el tic de pausa mirando a la pared.

## Criterios de aceptación

- [ ] Ningún fantasma liberado entra por la puerta en una partida completa, aunque Pac-Man esté justo debajo de la guarida.
- [ ] Ningún fantasma queda oscilando dentro de la guaria en una partida completa.
- [ ] Pinky, Inky y Clyde siguen saliendo escalonados (~2 s de separación) al inicio y tras perder una vida.
- [ ] El fantasma que se libera en (13,11) gira y avanza en el mismo tic, sin pausa visible.
- [ ] Pac-Man sigue sin poder entrar a la guaria.
- [ ] El túnel de la fila 14 sigue funcionando: los cuatro actores cruzan y reaparecen por el otro lado.
- [ ] Una partida completa (ganar o perder) no produce errores en consola.

## Decisiones

- **Sí:** puerta de un solo sentido (la celda 3 bloquea al fantasma liberado). Fiel al arcade original y elimina el atasco de raíz, en vez de parchear el síntoma.
- **No:** entrada bidireccional con escape anti-atasco forzado. Más código para un comportamiento que el arcade nunca tuvo.
- **Sí:** pulir el release en (13,11) dentro de esta spec. Es el mismo bloque de `decideGhost`; coste mínimo, salida más limpia.
- **No:** tocar las demoras escalonadas. La espera inicial quietos es intencional (SPEC 01), no un atasco.
- **No:** contadores de dots del arcade para salir. Sigue fuera, como quedó registrado en SPEC 01.

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Si la puerta bloquease a todo fantasma, la salida scriptada se rompería | La regla depende de `released`: solo bloquea con `released === true`; el que está saliendo (`false`) la cruza. |
| `canMove`/`isWall` también sirven a Pac-Man y al túnel | Pac-Man sigue enviando `'pacman'` y su comportamiento no cambia; el túnel se verifica en los criterios. |

## Lo que **no** está en esta spec

- Salida por contadores de dots.
- Scatter/chase, frightened y power pellets.
- Cambios de geometría o de demoras de salida.

Cada uno de esos puntos, si llega, va en su propia spec.
