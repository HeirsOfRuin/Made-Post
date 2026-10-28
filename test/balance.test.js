// The brief's three tests of success (section 10), asserted as orderings and
// gaps with their noise floors, not as magnitudes: magnitudes change with every
// rebalance, the shape should not. Measured numbers are in docs/DESIGN.md.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { play } from '../sim/bot.js';
import { rate } from '../sim/duel.js';
import { view } from '../src/engine/game.js';
import { noiseFloor } from '../sim/harness-stats.js';

const N = 60;
const seeds = Array.from({ length: N }, (_, i) => 1 + i * 7919);
const careers = (policy) => seeds.map((seed) => play(seed, { policy }));
const median = (xs) => { const v = [...xs].sort((a, b) => a - b); return v[Math.floor(v.length / 2)]; };
const share = (xs, f) => xs.filter(f).length / xs.length;

test('1. a harsh captain and a fair captain have different careers', () => {
  const fair = careers('fair');
  const harsh = careers('harsh');
  const mf = share(fair, (s) => s.record.mutinies > 0);
  const mh = share(harsh, (s) => s.record.mutinies > 0);
  assert.ok(100 * (mh - mf) > noiseFloor(mf, N, mh, N), `mutiny: harsh ${mh} vs fair ${mf}`);
  const sf = median(fair.map((s) => view(s).ending.score.total));
  const sh = median(harsh.map((s) => view(s).ending.score.total));
  assert.ok(sf > sh, `median score: fair ${sf} should beat harsh ${sh}`);
  assert.ok(share(harsh, (s) => s.ending.kind === 'mutiny') > 0, 'no harsh captain was ever murdered: the Hermione outcome is unreachable');
});

test('2. drill beats size: a drilled smaller frigate wins fights a lazy bigger one loses', () => {
  const runs = 200;
  const small = rate(runs, { cls: 'frigate32', enemy: 'french', gunnery: 85, seamanship: 65 });
  const big = rate(runs, { cls: 'frigate38', enemy: 'french', gunnery: 35, seamanship: 45 });
  assert.ok(100 * (small.won - big.won) > noiseFloor(small.won, runs, big.won, runs), `drilled 32 ${small.won} vs lazy 38 ${big.won}`);
  assert.ok(small.won > 0.4 && big.won < 0.4, `drilled 32 won ${small.won}, lazy 38 won ${big.won}`);
  const drilled = careers('drilled');
  const lazy = careers('lazy');
  const wd = median(drilled.map((s) => (s.record.actions ? s.record.won / s.record.actions : 0)));
  const wl = median(lazy.map((s) => (s.record.actions ? s.record.won / s.record.actions : 0)));
  assert.ok(wd > wl, `share of actions won: drilled ${wd} vs lazy ${wl}`);
});

test('3. runs end differently', () => {
  const kinds = new Set();
  for (const p of ['fair', 'harsh', 'lenient', 'lazy']) for (const s of careers(p).slice(0, 30)) kinds.add(s.ending.kind);
  assert.ok(kinds.size >= 4, `only ${[...kinds].join(', ')}`);
});
