import { test } from 'node:test';
import assert from 'node:assert/strict';
import { exportCode, importCode, migrate } from '../src/ui/save.js';
import { play } from '../sim/bot.js';
import { newGame, choose, view } from '../src/engine/game.js';

test('a save code round-trips a game mid-career and play continues identically', () => {
  let s = newGame({ seed: 5 });
  s = choose(s, { type: 'port', id: 'press' });
  s = choose(s, { type: 'port', id: 'sail' });
  for (let i = 0; i < 4 && s.phase === 'sea'; i++) s = choose(s, { type: 'advance' });
  const back = importCode(exportCode(s));
  assert.deepEqual(back, JSON.parse(JSON.stringify(s)));
  if (s.phase === 'sea') assert.equal(JSON.stringify(choose(back, { type: 'advance' })), JSON.stringify(choose(s, { type: 'advance' })));
});

test('a finished career survives the code too', () => {
  const s = play(9, { policy: 'fair' });
  const back = importCode(exportCode(s));
  assert.equal(view(back).ending.score.total, view(s).ending.score.total);
});

test('a code that is not ours is refused with a reason', () => {
  assert.throws(() => importCode('hello'), /MADP1/);
});

test('current saves need no migration', () => {
  const s = newGame({ seed: 1 });
  assert.equal(migrate(s), s);
});
