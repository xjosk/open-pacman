# SPEC 01 — Cuatro fantasmas con personalidades clásicas

> **Estado:** Aprobado
> **Dependencias:** ninguna
> **Fecha:** 2026-11-24
> **Objetivo:** Tener cuatro fantasmas con las personalidades clásicas del arcade — Blinky persigue agresivamente a Pac-Man — con salida escalonada de la guarida.

## Alcance

**Dentro:**

- Cuatro fantasmas con `kind` propio (`blinky`, `pinky`, `inky`, `clyde`) que sustituyen a los actuales `hunter` y `random`.
- IA de objetivo por personalidad en `decideGhost` (`src/js/game.js`):
  - **Blinky** (rojo): persigue directo la celda de Pac-Man.
  - **Pinky** (rosa): apunta 4 celdas por delante de la dirección de Pac-Man.
  - **Inky** (cian): flanquea; su objetivo es el reflejo de la posición de Blinky respecto a un punto 2 celdas delante de Pac-Man.
  - **Clyde** (naranja): persigue a Pac-Man a más de 8 celdas de distancia; a 8 o menos huye hacia la esquina inferior izquierda (celda (1,29)).
- Salida escalonada de la guarida: Blinky arranca fuera (sobre la puerta) y Pinky, Inky y Clyde salen a los ~2 s, ~4 s y ~6 s.
- Color por `kind` en `src/js/render.js` en lugar de por índice.

**Fuera de alcance (para futuras specs):**

- Alternancia global de modos scatter/chase.
- Aceleración de Blinky al final de la partida (Cruise Elroy).
- Power pellets, modo frightened y comer fantasmas.
- Salida de guarida por contadores de dots.

## Modelo de datos

```js
// maze.js — GHOST_STARTS pasa de 2 a 4 entradas
const GHOST_STARTS = [
  { x: 13, y: 11, kind: 'blinky', releaseDelay: 0 },   // fuera, sobre la puerta
  { x: 13, y: 14, kind: 'pinky',  releaseDelay: 120 },  // ~2 s a 60 fps
  { x: 12, y: 14, kind: 'inky',   releaseDelay: 240 },  // ~4 s
  { x: 15, y: 14, kind: 'clyde',  releaseDelay: 360 },  // ~6 s
];

// game.js — cada fantasma en game.ghosts gana dos campos
{
  kind: 'blinky',
  released: false, // true cuando ya está fuera de la guarida
  penFrames: 120,  // frames restantes antes de iniciar la salida
}
```

Convenciones: coordenadas de celda con origen arriba-izquierda; velocidades en celdas/frame (`GHOST_SPEED = 0.1` para todos); retardos en frames asumiendo 60 fps, como el resto del juego.

## Plan de implementación

1. `src/js/maze.js`: reemplazar `GHOST_STARTS` por las 4 entradas nuevas con `kind` y `releaseDelay`. Verificación manual: abrir `src/index.html`, se ven 4 fantasmas (uno sobre la puerta y tres en la guarida) sin errores en consola.
2. `src/js/game.js`: crear los fantasmas con `released` y `penFrames`, y en `decideGhost` implementar la salida de la guarida: esperar `penFrames`, caminar hacia la columna 13, subir atravesando la puerta y marcar `released = true` al llegar a (13,11); reiniciar ambos campos en `resetPositions`. Verificación manual: los tres fantasmas interiores emergen escalonados y, tras perder una vida, vuelven a esperar.
3. `src/js/game.js`: sustituir la lógica `hunter`/`random` por una función `ghostTarget(game, g)` según el `kind`, y elegir siempre la dirección válida que minimice la distancia Manhattan al objetivo, sin retroceder (salvo callejón) y con desempate clásico up > left > down > right. Verificación manual: Blinky corta el paso directo, Pinky se adelanta, Inky flanquea y Clyde alterna persecución y huida.
4. `src/js/render.js`: sustituir el array `GHOST_COLORS` por un mapa por `kind` (blinky `#ff0000`, pinky `#ffb8ff`, inky `#00ffff`, clyde `#ffb852`). Verificación manual: cada personalidad se distingue por su color arcade.

## Criterios de aceptación

- [ ] Al iniciar se ven 4 fantasmas: rojo fuera de la guarida y rosa, cian y naranja dentro.
- [ ] Pinky, Inky y Clyde salen de la guarida en ese orden, con ~2 s de separación.
- [ ] Blinky siempre elige la dirección que reduce la distancia a la celda de Pac-Man.
- [ ] En un pasillo recto, Pinky se adelanta hasta cortar el paso por delante de Pac-Man.
- [ ] El objetivo de Inky se calcula con la posición de Blinky (reflejo respecto a 2 celdas delante de Pac-Man).
- [ ] Clyde huye hacia (1,29) cuando está a 8 celdas o menos de Pac-Man y persigue a mayor distancia.
- [ ] Ningún fantasma da un giro de 180° excepto en callejón sin salida.
- [ ] Pac-Man sigue sin poder entrar a la guarida.
- [ ] Tras perder una vida los cuatro fantasmas vuelven a su posición inicial y los retardos se reinician.
- [ ] Una partida completa (ganar o perder) no produce errores en consola.

## Decisiones

- **Sí:** personalidades clásicas del arcade. Conocidas, documentadas y verificables a simple vista.
- **Sí:** salida escalonada por temporizador (120/240/360 frames). Más simple que los contadores de dots del arcade real.
- **Sí:** identificadores clásicos. Los kind `hunter` y `random` desaparecen.
- **Sí:** salida por la columna 13. El motor usa celdas enteras y la puerta ocupa las columnas 13-14.
- **No:** alternancia global scatter/chase. Merece su propia spec.
- **No:** Cruise Elroy (aceleración final de Blinky). Merece su propia spec.
- **No:** replicar el bug histórico de Pinky (4 arriba + 4 izquierda cuando Pac-Man mira arriba). Se usa el objetivo ideal.

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| `requestAnimationFrame` no garantiza 60 fps; en pantallas de 120 Hz los retardos se acortan | Aceptado para el MVP: todo el juego ya asume 60 fps (velocidades en celdas/frame). |
| Inky puede parecer errático si Blinky está lejos o dentro del túnel | Comportamiento clásico; se acepta como parte del reto. |

## Lo que **no** está en esta spec

- Modos scatter/chase globales.
- Cruise Elroy.
- Power pellets y modo frightened.
- Salida por contadores de dots.

Cada uno de esos puntos, si llega, va en su propia spec.
