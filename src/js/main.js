// main.js
// Bucle, teclado y pantallas. Usa createGame/update/draw (globals).

const canvas = document.getElementById( 'game' );
const ctx = canvas.getContext( '2d' );
const overlay = document.getElementById( 'overlay' );
const actionBtn = document.getElementById( 'action-btn' );

let game = createGame();
let frame = 0; // cuenta tics de logica (60/s), no frames de render

const KEY_DIR = {
  ArrowLeft: 'left',
  ArrowRight: 'right',
  ArrowUp: 'up',
  ArrowDown: 'down',
};

document.addEventListener( 'keydown', ( e ) => {
  const dir = KEY_DIR[ e.key ];
  if ( !dir ) return;
  e.preventDefault();
  if ( game.state === 'playing' ) game.pacman.nextDir = dir;
} );

function showOverlay( title, cls, btnLabel ) {
  overlay.innerHTML =
    '<h1' + ( cls ? ' class="' + cls + '"' : '' ) + '>' + title + '</h1>' +
    '<button id="action-btn">' + btnLabel + '</button>';
  overlay.classList.add( 'show' );
  document.getElementById( 'action-btn' ).addEventListener( 'click', startGame );
}

function startGame() {
  game = createGame();
  game.state = 'playing';
  overlay.classList.remove( 'show' );
}

if ( actionBtn ) actionBtn.addEventListener( 'click', startGame );

// Estado local del bucle (no toca game).
const TICK_MS = 1000 / 60; // paso fijo: 60 tics de logica por segundo
const MAX_DT = 100;        // clamp: descartar tiempo de pestana oculta
let last = 0;              // timestamp del frame anterior
let acc = 0;               // ms acumulados pendientes de consumir en tics

function loop( now ) {
  // dt con clamp: el tiempo de una pestana oculta se descarta, no se
  // ejecuta de golpe al volver.
  const dt = Math.min( now - last, MAX_DT );
  last = now;
  acc += dt;

  // Consumir el acumulado en tics de paso fijo: la logica corre siempre a
  // 60 tics/s, sin importar la tasa de requestAnimationFrame del monitor.
  while ( acc >= TICK_MS ) {
    acc -= TICK_MS;
    frame++;
    if ( game.state === 'playing' ) {
      update( game );
      if ( game.state === 'won' ) showOverlay( 'GANASTE', 'win', 'Reiniciar' );
      else if ( game.state === 'lost' ) showOverlay( 'PERDISTE', 'lose', 'Reiniciar' );
    }
  }

  // start/won/lost: drenar el acumulador para que Start no ejecute tics
  // atrasados al (re)arrancar.
  if ( game.state !== 'playing' ) acc = 0;

  draw( ctx, game, frame );
  requestAnimationFrame( loop );
}

requestAnimationFrame( loop );
