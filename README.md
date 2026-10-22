# Duelo de las Ánimas

A Day of the Dead pixel-art fighting game for the browser. Climb three sombreros, beat three bosses, or
duel a friend on one keyboard. React + canvas, no game engine; every sprite is drawn by code in `art/`.

## Run it

```bash
npm install
npm run dev       # http://localhost:3000
npm run build && npm run preview   # production build on :4173
npm test          # simulation tests (Node 22+)
npm run lint      # tsc --noEmit
```

## Modes and controls

Story (one player vs the computer), local versus, and practice (a dummy that never hits back, infinite meter).

| | Player 1 | Player 2 (versus) |
|---|---|---|
| Move / jump / guard | `A` `D` / `W` / `S` | arrow keys |
| Light / heavy / special | `F` / `G` / `V` | `,` / `.` / `/` (or numpad 1 2 3) |
| Dodge / super | `H` / `Space` | `'` / `Enter` |

Alone, the arrow keys and `J K L U Enter` also work for player one. Gamepads: stick or d-pad, `X` light, `Y` heavy,
`B` special, `A` dodge, trigger for the super. `Esc` pauses, `M` mutes.

Hold back (or down) to block. A normal that connects can be cancelled into a stronger one
(light, heavy, special, super), so `F G V` chains. The super needs a full Calavera gauge.

## How it is put together

```
src/game/sim.ts        the rules: fixed 60 Hz, no DOM, no timers, deterministic (see sim.test.ts)
src/game/moves.ts      frame data and per-fighter numbers
src/game/ai.ts         the computer opponent, three difficulty levels (one per sombrero)
src/game/engine.ts     input -> sim -> sound -> renderer, one rAF loop
src/game/render.ts     everything on the 480x270 canvas: stage, sprites, effects, HUD
src/components/        menus, dialogue and modals (DOM, scaled with the canvas)
art/                   the pixel-art generator; `npm run art` rewrites src/assets and src/game/atlas.json
```

The simulation never touches rendering, so a whole match can run in Node: the tests play AI against AI
for every pairing and check that rounds reset, time-outs score, nobody gets stuck and combos stay bounded.

### The art

`art/lib/raster.mjs` is a small shaded-pixel rasteriser (capsules, ellipses, polygons with banded light,
dither and outlines per material). Fighters are posed skeletons (`art/lib/humanoid.mjs`, two-bone IK) drawn
part by part, with hand-placed pixels for faces. `art/stages.mjs` paints the three arenas and `art/fx.mjs`
the sparks, slashes and projectiles. Change a pose or a palette, run `npm run art`, reload.

## Sharing a preview

`npm run build && npm run preview`, then point a tunnel at port 4173, e.g. `cloudflared tunnel --url http://localhost:4173`.
The preview server already accepts `*.trycloudflare.com` hosts.
