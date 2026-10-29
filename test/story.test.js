// The story must match what happened. A commander passed over after the
// Glorious First of June was told the Admiralty was "deciding promotions" and
// then shown "Act 2: Made Post. Captain of a frigate..." (author's playtest).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { play } from '../sim/bot.js';
import { view } from '../src/engine/game.js';
import { TUTORIAL } from '../src/content/events.js';

const SEEDS = Array.from({ length: 40 }, (_, i) => 1 + i * 7919);

test('act breaks and act openings match the player\'s rank', () => {
  let passedOver = 0, promoted = 0;
  for (const background of ['naval', 'lowerdeck']) for (const policy of ['fair', 'lazy']) for (const seed of SEEDS.slice(0, 20)) {
    play(seed, {
      policy, background,
      each: (s) => {
        if (s.phase !== 'interlude') return;
        const v = view(s);
        const text = `${v.interlude.text.head} ${v.interlude.text.act ? v.interlude.text.act.intro : ''}`;
        if (s.player.rank === 'commander') {
          assert.ok(!/you are made post|Captain of a frigate|senior captain/i.test(text), `a commander was told: ${text}`);
          if (s.act === 0) passedOver++;
        } else {
          assert.ok(!/your name is not on it|still a commander/i.test(text), `a captain was told: ${text}`);
          if (s.act === 0) promoted++;
        }
      },
    });
  }
  assert.ok(passedOver > 0 && promoted > 0, `both branches must be met (passed over ${passedOver}, promoted ${promoted})`);
});

test('the first lieutenant\'s lessons all come up in Act 1, at varying times', () => {
  const weeks = {};
  for (const seed of SEEDS.slice(0, 20)) {
    const seen = {};
    play(seed, {
      policy: 'fair',
      each: (s) => { if (s.act === 0 && s.phase === 'decision' && s.pending.id.startsWith('tut-') && !seen[s.pending.id]) seen[s.pending.id] = s.commission.week; },
    });
    for (const t of TUTORIAL) {
      if (t.id === 'tut-action' && !seen[t.id]) continue; // skipped when a fight came first
      assert.ok(seen[t.id], `seed ${seed}: lesson ${t.id} never came up`);
      (weeks[t.id] ||= new Set()).add(seen[t.id]);
    }
  }
  const varied = Object.values(weeks).filter((w) => w.size > 1).length;
  assert.ok(varied >= 3, 'lessons arrive in the same week every game');
});
