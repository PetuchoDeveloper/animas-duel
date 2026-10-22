# Procedural soundtrack

`index.ts` exports the eight `SONGS`, motif, pure score helpers, `MusicPlayer`,
`MusicEngine`, instruments, and `renderSong`. No browser objects are read at import.

## Score format

A token is `note:beats`, `C4+E4+G4:beats`, `.:beats` (rest), or `x:beats`
(percussion). Octaves follow MIDI scientific pitch notation (C4 = 60).
`chord('A7b9', 3)` expands readable chord symbols. `pattern * repeat` must fill
`section.bars` exactly; a recorder rejects mismatches rather than truncating.
The score beat is a quarter except Huesos: one dotted quarter, two per 6/8 bar.
Swing delays offbeat attacks and shortens their releases to preserve bar ends.

To add a song, add a typed id and an entry in `songs.ts`; declare key, meter,
bpm, sections, intensity membership, and documented chromatic scale degrees.
Section `transpose` moves every pitched event; `key` declares the resulting key.
Chromatic exceptions are degrees relative to that resulting tonic. All voices
are normalized against chord polyphony; releases end within their score notes. Track nominal
sums stay below each song's 0.68 budget; this is a heuristic, not a measured peak.

## Structure and layers

A full pass includes the intro. Subsequent passes start at the first `loop: true`
section; victory, defeat, and ending explicitly do not loop. Offline `loops: 2`
means two passes (first requested section to end, then loop start to end).
Levels 0/1/2 enable tracks via `intensity`; final choruses expose all layers at
normal intensity. Changes fade at the next bar. Jumps invalidate queued futures
and silence/stop their sources at the chosen bar. Live scheduling runs every
25 ms with 180 ms look-ahead. Muting retains the wanted selection in `audio.ts`.
At most two music players and three stinger slots coexist. All voices stop and
release their nodes; noise, pulse waves, and distortion curves are context-cached.

## Motifs

El Macho: semitones `[0,3,5,6,12]`, beats `[.5,.5,.5,.5,1.5]`, then 1 beat rest.
`machoMotif(tonic, {mode, octave, speed})` preserves the signature blue b5;
major changes the minor third to a major third. Phrygian preserves the original.
Quotes: title/shadow (last 2 bars), map/distant-mask (last 4 bars),
huesos/breakdown (once), macho/chorus (full, with transformations elsewhere),
ending/unmasked (once, slow major muted trumpet). The ending also remodes
`MAP_HERO` into C major. No referenced soundtrack was looked up or copied.

## Offline rendering (browser)

```ts
import { SONGS, duration, renderSong } from './index.ts';
const song = SONGS.macho;
const sampleRate = 44100;
const ctx = new OfflineAudioContext(2, Math.ceil(duration(song) * sampleRate), sampleRate);
renderSong(ctx, ctx.destination, song); // optional {section: 'chorus', loops: 2}
const buffer = await ctx.startRendering(); // encode buffer to WAV in the host
```

For multiple passes allocate the length returned by `recordSong` with the same
options. Offline rendering uses every layer and the same synthesis as live audio.
Run only `node --test src/game/music.test.ts` for the scoped structural checks.
Listening, measured peaks, phone performance, tsc, and full gates belong to owner.
