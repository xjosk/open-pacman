# SPEC 02 — Velocidad de juego estable a 60 tics/s

> **Estado:** Implementado
> **Dependencias:** ninguna
> **Fecha:** 2026-11-24
> **Objetivo:** Que la lógica del juego corra a 60 tics por segundo, idénticos en cualquier navegador y tasa de refresco, eliminando la aceleración actual en monitores de 120 Hz o más.

## Alcance

**Dentro:**

- Bucle de paso fijo en `src/js/main.js`: `update()` se ejecuta exactamente 60 veces por segundo (tics) mediante un acumulador de tiempo, independientemente de la tasa de `requestAnimationFrame` (60, 120 o 144 Hz).
- `draw()` sigue ejecutándose una vez por cada frame disponible del navegador.
- Clamp del delta acumulado (tope ~100 ms): el tiempo transcurrido con la pestaña oculta se descarta en lugar de ejecutarse de golpe al volver.
- El contador `frame` (usado por la animación de la boca de Pac-Man en `src/js/render.js`) pasa a incrementarse por tic de lógica, normalizando también la animación.
- Drenar el acumulador cuando `game.state !== 'playing'` (start/won/lost) para que pulsar Start no ejecute tics atrasados.

**Fuera de alcance (para futuras specs):**

- Pausa manual (tecla o botón).
- HUD con contador de FPS.
- Velocidades distintas por nivel o dificultad configurable.
- Migrar las velocidades a celdas/segundo (delta-time).

## Modelo de datos

Esta feature no introduce datos nuevos en el estado del juego (`game`). Solo añade constantes y variables locales al bucle en `src/js/main.js`:

```js
// main.js — estado local del bucle (no toca game)
const TICK_MS = 1000 / 60; // paso fijo: 60 tics de lógica por segundo
const MAX_DT = 100;         // clamp: descartar tiempo de pestaña oculta
let last = 0;               // timestamp del frame anterior
let acc = 0;                // ms acumulados pendientes de consumir en tics
```

Convenciones: `frame` pasa a contar tics de lógica (60/s); las velocidades en celdas/frame y los retardos en frames de `game.js`/`maze.js` quedan sin cambios, como definió la spec 01.

## Plan de implementación

1. `src/js/main.js`: reescribir `loop()` a paso fijo — recibir el timestamp de `requestAnimationFrame(loop)`, calcular `dt = now - last` con clamp de `MAX_DT`, acumular en `acc` y consumirlo en tics de `TICK_MS`; en cada tic: `frame++` y, solo si `game.state === 'playing'`, `update(game)` con sus comprobaciones de `won`/`lost`; `draw(ctx, game, frame)` una vez por frame de render; `acc = 0` cuando el estado no es `playing`. Verificación manual: abrir `src/index.html` en Edge sobre un monitor de 120 Hz o más y comparar con el navegador de VS Code — misma velocidad de Pac-Man, fantasmas saliendo escalonados cada ~2 s, sin errores en consola.

## Criterios de aceptación

- [ ] En Edge sobre un monitor de 120 Hz o más, Pac-Man tarda ≈0,13 s (8 tics) en cruzar una celda, la misma velocidad que en el navegador de VS Code.
- [ ] Pinky, Inky y Clyde salen de la guarida con ~2 s de separación entre sí en cualquier tasa de refresco.
- [ ] La boca de Pac-Man se abre y cierra al mismo ritmo a 60 Hz que a 120 Hz+.
- [ ] Cambiar de pestaña en plena partida y volver hace que la partida continúe donde estaba, sin saltos de posición.
- [ ] Pulsar Start (o Reiniciar tras ganar/perder) arranca sin ráfaga de tics atrasados.
- [ ] Una partida completa (ganar o perder) no produce errores en consola.

## Decisiones

- **Sí:** paso fijo a 60 tics/s (acumulador) en `main.js`. Todo el motor ya asume 60 fps (riesgo documentado y aceptado en la spec 01); así ninguna constante de `game.js`/`maze.js` cambia.
- **No:** delta-time con velocidades en celdas/segundo. Obliga a reescribir `aligned()` y el movimiento (que asume pasos exactos de 1/8 de celda); alto riesgo de regresión.
- **Sí:** clamp del delta a ~100 ms. El tiempo con la pestaña oculta se descarta y la partida continúa sin saltos al volver.
- **No:** ponerse al día tras volver de una pestaña oculta. Ejecutaría decenas de tics de golpe, con saltos de posición injustos.
- **Sí:** `frame` incrementa por tic (no por frame de render). Normaliza también la animación de la boca.
- **No:** pausa manual, HUD de FPS y velocidad por nivel. Cada uno va en su propia spec si llega.

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| A ~60 Hz el acumulador puede alternar 0 y 2 tics por frame por redondeo | Inevitable y sin impacto: la lógica es determinista por tic; solo se repite u omite un frame de render. |
| Las pestañas ocultas entregan deltas enormes (≥1 s) al volver | El clamp de 100 ms descarta el exceso: no se ejecuta ninguna ráfaga de tics. |

## Lo que **no** está en esta spec

- Pausa manual.
- HUD con contador de FPS.
- Velocidades distintas por nivel o dificultad configurable.
- Migración a delta-time (celdas/segundo).

Cada uno de esos puntos, si llega, va en su propia spec.
