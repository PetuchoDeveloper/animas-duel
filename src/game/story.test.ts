/** The story data and the three sombreros must stay in step: scenes for both heroes, a boss and a trouble kind per level. */

import test from 'node:test';
import assert from 'node:assert/strict';
import { BOSSES, HEROES, ROSTER, SOMBREROS } from './roster.ts';
import { storyScene, TROUBLE } from './storyDialogues.ts';
import type { SceneId } from './storyDialogues.ts';

const SCENES: SceneId[] = ['level1Intro', 'level1Outro', 'level2Intro', 'level2Outro', 'level3Intro', 'epilogue'];

test('every scene is complete for every hero and only names fighters that exist', () => {
  for (const hero of HEROES) {
    for (const id of SCENES) {
      const lines = storyScene(id, hero);
      assert.ok(lines.length >= 3, `${id} is too short`);
      for (const l of lines) {
        assert.ok(ROSTER[l.speakerId], `${id}: unknown speaker ${l.speakerId}`);
        assert.ok(l.spanishText && l.englishSub, `${id}: a line has no text for ${hero}`);
      }
    }
  }
});

test('one boss and one kind of trouble per sombrero, with El Macho last', () => {
  assert.equal(BOSSES.length, SOMBREROS.length);
  assert.equal(TROUBLE.length, SOMBREROS.length);
  assert.equal(BOSSES.at(-1), 'elmacho');
  assert.equal(TROUBLE.at(-1), null);
  for (const level of [1, 2]) assert.ok(storyScene(`level${level}Outro` as SceneId, HEROES[0]).some((l) => l.speakerId === 'elmacho'), `El Macho must show up after level ${level}`);
});
