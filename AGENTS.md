# AGENTS.md

Pac-Man MVP in vanilla JS/HTML/CSS drawn on a `<canvas>`. There is **no build system, no package manager, no bundler, no test suite** — don't look for `package.json`/configs, and don't introduce tooling unless asked.

## Run / verify

Open `src/index.html` directly in a browser (e.g. `open src/index.html`). No dev server or build step. This is also the only verification: play a game via the Start overlay and arrow keys. There are no automated tests to run.

## Architecture — script order is the contract

Four plain scripts are loaded in this exact order by `src/index.html`:

1. `maze.js` — exports on `window`: `MAZE`, `TUNNEL_ROW`, `PACMAN_START`, `GHOST_STARTS`
2. `game.js` — exports: `createGame`, `update`, `DIRS`
3. `render.js` — exports: `draw`
4. `main.js` — game loop, keyboard, overlay; consumes the globals above

They communicate **only via `window` globals** — no ES modules, no imports. Adding `import`/`export` or reordering the `<script>` tags breaks everything. A new file needs a `<script>` tag in the right position.

## Data-model gotchas

- Tile codes: `0` empty path, `1` wall, `2` dot, `3` pen door (blocks Pac-Man, passable by ghosts), `4` power pellet (bigger, blinks, worth 50 points, counts toward victory like a dot).
- `MAZE` (from `maze.js`) is the pristine 28×31 template — never mutate it. `createGame()` copies it into `game.grid` per game; dots are eaten by mutating `game.grid`. Render from `game.grid`, not `MAZE`.
- `TILE = 20` (render.js) ties maze dims to the hardcoded canvas size in `index.html` (28×20 = 560 wide, 31×20 = 620 high). Changing maze geometry or `TILE` requires updating the canvas attributes too.
- Row 14 is the tunnel: actors exiting the left/right edge wrap around (`wrapTunnel`).
- Positions are float sub-cell coordinates with speed in cells/frame (Pac-Man 0.125, ghosts 0.1). Turns and dot-eating only apply when an actor is aligned to a cell center (`aligned()`).
- Game states: `start` → `playing` → `won` (all dots eaten) / `lost` (3 lives gone; ghost collision at distance < 0.5 cells resets positions).

## Language

Comments, UI strings (overlay, HUD), and specs are in **Spanish** — keep new code comments and user-facing text in Spanish.

## Spec-driven workflow

This repo exists to practice spec-driven development (see `README.md`). Features go through the installed skills in `.agents/skills/` (pinned in `skills-lock.json`) rather than straight coding:

1. `/spec "<one-sentence feature>"` — asks clarifying questions, then writes `specs/NN-slug.md` with state `Draft`. The agent never marks a spec `Approved`; the human does.
2. `/spec-impl NN-slug` — refuses any spec whose state is not Approved; creates/switches to branch `spec-NN-slug` and implements the plan step by step, pausing for review after each step.

`specs/.spec-config.yml` is created by the first spec and controls the flow: defaults are `AutoCreateBranch: true`, `AutoCommitSteps: false` — meaning **never commit unless explicitly asked**; when committing a step, stage only that step's files (never `git add -A`) with message `spec-NN-step-MM`.

The `specs/` folder does not exist yet — it will be created by the first `/spec` run.
