// game.js
// Estado y reglas. Depende de globals de maze.js: MAZE, TUNNEL_ROW,
// PACMAN_START, GHOST_STARTS.

const DIRS = {
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
};
const OPPOSITE = { left: 'right', right: 'left', up: 'down', down: 'up' };
// Prioridad clasica de desempate al elegir direccion: up > left > down > right.
const DIR_PRIORITY = [ 'up', 'left', 'down', 'right' ];

const PACMAN_SPEED = 0.125; // 1/8 celda/frame -> alinea cada 8 frames
const GHOST_SPEED = 0.1;    // 1/10 celda/frame

// Crea una partida nueva. Copia MAZE (pristino) a game.grid para poder comer
// dots sin destruir el original, y reiniciar.
function createGame() {
  const grid = MAZE.map( ( row ) => row.slice() );
  // La celda de inicio de Pacman arranca sin dot.
  grid[ PACMAN_START.y ][ PACMAN_START.x ] = 0;

  let dots = 0;
  for ( const row of grid ) for ( const v of row ) if ( v === 2 ) dots++;

  return {
    state: 'start',
    score: 0,
    lives: 3,
    dotsRemaining: dots,
    grid,
    pacman: {
      x: PACMAN_START.x,
      y: PACMAN_START.y,
      dir: 'left',
      nextDir: null,
      speed: PACMAN_SPEED,
    },
    ghosts: GHOST_STARTS.map( ( g ) => ( {
      x: g.x,
      y: g.y,
      dir: 'up',
      speed: GHOST_SPEED,
      kind: g.kind,
      released: g.releaseDelay === 0, // blinky arranca fuera de la guarida
      penFrames: g.releaseDelay, // frames restantes antes de iniciar la salida
    } ) ),
  };
}

function aligned( v ) {
  return Math.abs( v - Math.round( v ) ) < 1e-3;
}

// Una celda es muro para el actor dado?
//   actor: 'pacman' | objeto fantasma g
//   pared (1): muro para todos.
//   puerta (3): muro para Pac-Man y para todo fantasma ya liberado (un
//               liberado nunca reentra a la guarida); pasable para el que
//               aun esta saliendo (released === false).
function isWall( grid, x, y, actor ) {
  if ( y < 0 || y >= grid.length ) return true;
  if ( x < 0 || x >= grid[ 0 ].length ) return true;
  const v = grid[ y ][ x ];
  if ( v === 1 ) return true;
  if ( v === 3 && ( actor === 'pacman' || actor.released ) ) return true;
  return false;
}

// Puede el actor avanzar desde (x,y) en la direccion dir?
function canMove( grid, x, y, dir, actor ) {
  const d = DIRS[ dir ];
  if ( !d ) return false;
  const tx = x + d.x;
  const ty = y + d.y;
  // Tunel: salir por un borde en la fila del tunel siempre es valido.
  if ( ty === TUNNEL_ROW && ( tx < 0 || tx >= grid[ 0 ].length ) ) return true;
  return !isWall( grid, tx, ty, actor );
}

function wrapTunnel( a, width ) {
  if ( Math.round( a.y ) === TUNNEL_ROW ) {
    if ( a.x < 0 ) a.x += width;
    else if ( a.x >= width ) a.x -= width;
  }
}

function movePacman( game ) {
  const p = game.pacman;
  const grid = game.grid;
  const width = grid[ 0 ].length;

  if ( aligned( p.x ) && aligned( p.y ) ) {
    p.x = Math.round( p.x );
    p.y = Math.round( p.y );

    // Aplicar giro pendiente si es posible.
    if ( p.nextDir && canMove( grid, p.x, p.y, p.nextDir, 'pacman' ) ) {
      p.dir = p.nextDir;
      p.nextDir = null;
    }
    // Comer dot.
    if ( grid[ p.y ][ p.x ] === 2 ) {
      grid[ p.y ][ p.x ] = 0;
      game.score += 10;
      game.dotsRemaining--;
    }
    // Si no puede seguir, se detiene en la celda.
    if ( !canMove( grid, p.x, p.y, p.dir, 'pacman' ) ) return;
  }

  const d = DIRS[ p.dir ];
  p.x += d.x * p.speed;
  p.y += d.y * p.speed;
  wrapTunnel( p, width );
}

// Objetivo (celda) de cada fantasma segun su personalidad clasica.
// Puede caer fuera del laberinto (p. ej. Pinky/Inky): solo se usa para
// comparar distancias Manhattan, nunca para indexar la cuadricula.
function ghostTarget( game, g ) {
  const p = game.pacman;
  const px = Math.round( p.x );
  const py = Math.round( p.y );

  if ( g.kind === 'blinky' ) {
    return { x: px, y: py }; // persigue directo la celda de Pac-Man
  }

  if ( g.kind === 'pinky' ) {
    // 4 celdas por delante de la direccion de Pac-Man (objetivo ideal,
    // sin el bug historico del arcade).
    const d = DIRS[ p.dir ];
    return { x: px + d.x * 4, y: py + d.y * 4 };
  }

  if ( g.kind === 'inky' ) {
    // Flanqueo: reflejo de Blinky respecto al punto 2 celdas delante
    // de Pac-Man (pivot * 2 - blinky).
    const d = DIRS[ p.dir ];
    const ax = px + d.x * 2;
    const ay = py + d.y * 2;
    const blinky = game.ghosts.find( ( gh ) => gh.kind === 'blinky' ) || g;
    return { x: ax * 2 - Math.round( blinky.x ), y: ay * 2 - Math.round( blinky.y ) };
  }

  if ( g.kind === 'clyde' ) {
    // Persigue a mas de 8 celdas; a 8 o menos huye hacia la esquina
    // inferior izquierda (1,29).
    const dist = Math.abs( g.x - px ) + Math.abs( g.y - py );
    if ( dist <= 8 ) return { x: 1, y: 29 };
    return { x: px, y: py };
  }

  // kind desconocido: comportarse como blinky.
  return { x: px, y: py };
}

function decideGhost( game, g ) {
  const grid = game.grid;

  // Salida escalonada de la guarida: esperar penFrames, caminar hasta la
  // columna 13, subir atravesando la puerta y marcarse liberado en (13,11).
  // (decideGhost solo se llama con el fantasma alineado: x e y son enteros.)
  if ( !g.released ) {
    if ( g.penFrames > 0 ) {
      g.penFrames--;
      g.dir = null; // quieto: canMove devuelve false y moveGhost no avanza
      return;
    }
    if ( g.x === 13 && g.y === 11 ) {
      // Ya esta fuera, sobre la puerta: liberarse y caer en este mismo tic
      // a la logica de persecucion, sin conservar la 'up' heredada (arriba
      // hay pared). Sin direccion previa, la puerta de abajo se descarta
      // sola: ya es muro para un fantasma liberado.
      g.released = true;
      g.dir = null;
    } else {
      if ( g.x < 13 ) g.dir = 'right';
      else if ( g.x > 13 ) g.dir = 'left';
      else g.dir = 'up';
      return;
    }
  }

  const options = DIR_PRIORITY.filter(
    ( dir ) => dir !== OPPOSITE[ g.dir ] && canMove( grid, g.x, g.y, dir, g )
  );
  // Sin salida (callejon): permitir el giro de 180.
  const choices = options.length ? options : [ '' + OPPOSITE[ g.dir ] ];

  // Direccion valida que minimiza la distancia Manhattan al objetivo del
  // kind. Se recorre en orden DIR_PRIORITY y solo se mejora con '<'
  // estricto, asi el desempate es el clasico: up > left > down > right.
  const t = ghostTarget( game, g );
  let best = choices[ 0 ];
  let bestDist = Infinity;
  for ( const dir of choices ) {
    const d = DIRS[ dir ];
    const nx = g.x + d.x;
    const ny = g.y + d.y;
    const dist = Math.abs( nx - t.x ) + Math.abs( ny - t.y );
    if ( dist < bestDist ) {
      bestDist = dist;
      best = dir;
    }
  }
  g.dir = best;
}

function moveGhost( game, g ) {
  const grid = game.grid;
  const width = grid[ 0 ].length;

  if ( aligned( g.x ) && aligned( g.y ) ) {
    g.x = Math.round( g.x );
    g.y = Math.round( g.y );
    decideGhost( game, g );
    if ( !canMove( grid, g.x, g.y, g.dir, g ) ) return;
  }

  const d = DIRS[ g.dir ];
  g.x += d.x * g.speed;
  g.y += d.y * g.speed;
  wrapTunnel( g, width );
}

function resetPositions( game ) {
  const p = game.pacman;
  p.x = PACMAN_START.x;
  p.y = PACMAN_START.y;
  p.dir = 'left';
  p.nextDir = null;
  game.ghosts.forEach( ( g, i ) => {
    const start = GHOST_STARTS[ i ];
    g.x = start.x;
    g.y = start.y;
    g.dir = 'up';
    g.released = start.releaseDelay === 0; // blinky vuelve a quedar fuera
    g.penFrames = start.releaseDelay; // los demas vuelven a esperar
  } );
}

function collides( a, b ) {
  return Math.abs( a.x - b.x ) < 0.5 && Math.abs( a.y - b.y ) < 0.5;
}

function update( game ) {
  movePacman( game );
  game.ghosts.forEach( ( g ) => moveGhost( game, g ) );

  for ( const g of game.ghosts ) {
    if ( collides( game.pacman, g ) ) {
      game.lives--;
      if ( game.lives <= 0 ) {
        game.state = 'lost';
        return;
      }
      resetPositions( game );
      break;
    }
  }

  if ( game.dotsRemaining <= 0 ) game.state = 'won';
}

window.createGame = createGame;
window.update = update;
window.DIRS = DIRS;
