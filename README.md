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

Story order: Ernesto (sombrero 1), Huesos (2), El Macho (3, final). A map shows the road between sombreros;
after each win El Macho turns up in the outro, steals a petal and sabotages the next arena: barrels rolling
across the first sombrero, anvils falling on the second. Hazards are deterministic (`sim.ts`, option `trouble`)
and hit either fighter, so the boss can be lured under an anvil.

| | Player 1 | Player 2 (versus) |
|---|---|---|
| Move / jump / guard | `A` `D` / `W` / `S` | arrow keys |
| Light / heavy / special | `F` / `G` / `V` | `,` / `.` / `/` (or numpad 1 2 3) |
| Dodge / super | `H` / `Space` | `'` / `Enter` |

Alone, the arrow keys and `J K L U Enter` also work for player one. Gamepads: stick or d-pad, `X` light, `Y` heavy,
`B` special, `A` dodge, trigger for the super. On touch screens a d-pad and attack buttons appear over the
battle (player one only). `Esc` pauses, `M` mutes.

Hold back (or down) to block. A normal that connects can be cancelled into a stronger one
(light, heavy, special, super), so `F G V` chains. The super needs a full Calavera gauge.

## How it is put together

```
src/game/sim.ts        the rules: fixed 60 Hz, no DOM, no timers, deterministic (see sim.test.ts)
src/game/moves.ts      frame data and per-fighter numbers
src/game/ai.ts         the computer opponent, three difficulty levels (one per sombrero)
src/game/engine.ts     input -> sim -> sound -> renderer, one rAF loop
src/game/render.ts     everything on the 480x270 canvas: stage, sprites, effects, camera, impact frames, HUD
src/game/audio.ts      sound effects, announcer and the `gameAudio` music API
src/game/music/        the procedural soundtrack: scores, synth instruments, player (see its README)
src/components/        menus, map, dialogue and modals (DOM, scaled with the canvas)
art/                   the pixel-art generator; `npm run art` rewrites src/assets and src/game/atlas.json
```

The simulation never touches rendering, so a whole match can run in Node: the tests play AI against AI
for every pairing and check that rounds reset, time-outs score, nobody gets stuck and combos stay bounded.

### The art

`art/lib/raster.mjs` is a small shaded-pixel rasteriser (capsules, ellipses, polygons with banded light,
dither and outlines per material). Fighters are posed skeletons (`art/lib/humanoid.mjs`, two-bone IK) drawn
part by part, with hand-placed pixels for faces. `art/stages.mjs` paints the three arenas and `art/fx.mjs`
the sparks, slashes and projectiles. Change a pose or a palette, run `npm run art`, reload.

### Camera and impact frames

`render.ts` `updateCamera` rests at zoom 1 so pixels stay crisp, opens each round on the boss and pans to the
hero, kicks on hits, closes in on a super and a KO (the engine adds slow motion) and glances at incoming
hazards. Knockdowns, specials, supers, anvil hits and KOs flash a high-contrast impact frame (`drawImpact`).
Both are skipped when the system asks for reduced motion.

### Music

Every song is a score in `src/game/music/songs.ts`, synthesised live with Web Audio; nothing is a sample.
Title and select play `title`, the map and story dialogue `map`, each arena its boss's song (`ernesto`,
`huesos`, `macho`, in every mode), the epilogue `ending`; a match result plays `victory` or `defeat`. The final
round jumps to the song's `final` section. El Macho's motif (semitones 0 3 5 6 12) runs through his own
song and is quoted in the others; it also plays as a stinger when he speaks or drops a hazard.

```ts
gameAudio.playTrack('map', { section: 'lanterns', fadeIn: 1 }); // crossfades; same id only jumps
gameAudio.jumpTo('final');           // at the next bar
gameAudio.stinger('impact');         // machoTrouble | machoLaugh | impact | roundWin | ko
gameAudio.setMusicIntensity(2);      // 0 | 1 | 2, layers per track
gameAudio.stopMusic(0.8);
```

To add a song: add its id to `TrackId` in `music/score.ts`, build it in `songs.ts` with `createSong` and
`section(...)`, and add it to `SONGS`. `music/README.md` describes the score format; `src/game/music.test.ts`
checks that every pattern fills its bars.

## Sharing a preview

`npm run build && npm run preview`, then point a tunnel at port 4173, e.g. `cloudflared tunnel --url http://localhost:4173`.
The preview server already accepts `*.trycloudflare.com` hosts.
