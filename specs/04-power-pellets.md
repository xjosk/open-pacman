# SPEC 04 — Power pellets en las esquinas

> **Estado:** Implementado
> **Dependencias:** ninguna
> **Fecha:** 2026-11-24
> **Objetivo:** Añadir cuatro power pellets parpadeantes en las posiciones clásicas de las esquinas del laberinto, que dan 50 puntos al comerlos y cuentan para ganar la partida.

## Alcance

**Dentro:**

- Nuevo código de tile en `src/js/maze.js`: `4` = power pellet, escrito como `'o'` en `MAZE_STR`. Sustituye al dot en las cuatro celdas clásicas del arcade: (1,3), (26,3), (1,23) y (26,23).
- `src/js/render.js`: nueva función `drawPellets( ctx, grid, frame )` llamada desde `draw` después de `drawDots` — círculos de ~7 px de radio que parpadean (10 tics visibles / 10 ocultos) con el contador `frame` (tics de lógica).
- `src/js/game.js`: comer un pellet en `movePacman` vacía la celda, suma 50 puntos y descuenta `dotsRemaining`; `createGame` pasa a contar los tiles `2` y `4`.
- Actualizar la lista de códigos de tile en `AGENTS.md` (añadir `4`).

**Fuera de alcance (para futuras specs):**

- Modo frightened: fantasmas azules, huidizos y comestibles (ya aplazado en SPEC 01).
- Cadena de puntos por comer fantasmas (200/400/800/1600).
- Sonidos o efectos visuales al comer un pellet.
- Cambios en la IA o velocidad de los fantasmas por comer un pellet.

## Modelo de datos

No hay estado nuevo en `game`: el pellet vive en `game.grid` como tile `4` y se come igual que un dot. Solo cambian las cadenas de `maze.js`, una condición de conteo y dos constantes de render:

```js
// maze.js — parseTile gana un código; las filas 3 y 23 cambian 4 chars
//   '#' pared(1) · '.' dot(2) · ' ' vacio transitable(0) · '-' puerta pen(3) · 'o' power pellet(4)
if ( ch === 'o' ) return 4;

// fila 3 (antes): '#.####.#####.##.#####.####.#'
'#o####.#####.##.#####.####o#', // 3   pellets en (1,3) y (26,3)
// fila 23 (antes): '#...##................##...#'
'#o..##................##..o#', // 23  pellets en (1,23) y (26,23)
```

```js
// game.js — createGame: la victoria sigue siendo dotsRemaining === 0
for ( const row of grid ) for ( const v of row ) if ( v === 2 || v === 4 ) dots++;

// render.js — constantes nuevas (locales al módulo)
const PELLET_RADIUS = 7;        // el dot común usa 2.5
const PELLET_BLINK_TICS = 10;   // ~0,17 s visibles / ~0,17 s ocultos a 60 tics/s
```

El total inicial de `dotsRemaining` no cambia: cuatro celdas que eran dot pasan a ser pellet, pero siguen contándose.

Convenciones: coordenadas de celda con origen arriba-izquierda; parpadeo medido en tics de lógica (60/s, SPEC 02).

## Plan de implementación

1. `src/js/maze.js` + `src/js/render.js` (+ `AGENTS.md`): añadir el tile `4` con sus cuatro `'o'` en las filas 3 y 23, documentarlo en el comentario de cabecera de `maze.js` y en la lista de tiles de `AGENTS.md`, y crear `drawPellets( ctx, grid, frame )` llamada desde `draw` tras `drawDots`. Verificación manual: abrir `src/index.html` — se ven cuatro círculos grandes parpadeando en las esquinas clásicas; ninguna otra celda cambia; sin errores en consola. (En este paso aún no se comen ni cuentan: Pac-Man los atraviesa y la partida sigue siendo ganable solo con dots.)
2. `src/js/game.js`: contar `v === 2 || v === 4` en `createGame` y comer el tile `4` en `movePacman` (celda → `0`, `score += 50`, `dotsRemaining--`). Verificación manual: comer un pellet y ver `SCORE` subir exactamente 50; comer todos los dots y los 4 pellets muestra `GANASTE`; perder una vida no hace reaparecer los pellets comidos.

## Criterios de aceptación

- [ ] Al arrancar se ven exactamente 4 power pellets, claramente mayores que los dots, en (1,3), (26,3), (1,23) y (26,23).
- [ ] Los pellets parpadean con ritmo constante (~10 tics visibles / ~10 ocultos) tanto a 60 Hz como a 120 Hz o más.
- [ ] Comer un pellet suma exactamente 50 puntos en el HUD y el pellet desaparece.
- [ ] Con todos los dots normales comidos y algún pellet pendiente no aparece `GANASTE`; al comer el último pellet, sí.
- [ ] Tras perder una vida, los pellets ya comidos no reaparecen (igual que los dots).
- [ ] El laberinto sigue siendo simétrico: las filas 3 y 23 son espejo respecto al eje central.
- [ ] Los fantasmas no cambian de comportamiento cerca de un pellet (siguen persiguiendo; sin frightened).
- [ ] La celda de inicio de Pac-Man (13,23) sigue arrancando sin dot.
- [ ] Una partida completa (ganar o perder) no produce errores en consola.

## Decisiones

- **Sí:** tile `4` / char `'o'` en `MAZE_STR`. Extiende el sistema de códigos existente; para el motor, el pellet es "un dot grande".
- **Sí:** posiciones clásicas del arcade. El laberinto ya declara ser fiel al nivel 1; "esquina" significa las cuatro celdas del original.
- **No:** esquinas literales (1,1), (26,1), (1,29), (26,29). El original nunca las puso ahí.
- **Sí:** 50 puntos y cuentan para la victoria (`dotsRemaining`). Comportamiento del arcade.
- **Sí:** parpadeo con `frame`, que ya llega a `draw`. Sin datos nuevos ni cambios en el bucle.
- **No:** modo frightened y comer fantasmas en esta spec. Ya aplazado en SPEC 01; merece spec propia por su tamaño (IA, colisiones, temporizador, render).
- **No:** sonidos o animación al comer. No existe sistema de audio en el MVP.

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Olvidar contar los tiles `4` haría aparecer `GANASTE` con pellets aún en pantalla | Criterio de aceptación explícito: ganar exige los 4 comidos. |
| El ritmo del parpadeo hereda la tasa de tics de SPEC 02 | `frame` cuenta tics de lógica, no frames de render; el criterio a 120 Hz+ lo verifica. |

## Lo que **no** está en esta spec

- Modo frightened y comer fantasmas.
- Sonidos o efectos al comer un pellet.
- Cambios de IA o velocidad de los fantasmas.

Cada uno de esos puntos, si llega, va en su propia spec.
