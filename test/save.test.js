import { test } from 'node:test';
import assert from 'node:assert/strict';
import { exportCode, importCode, migrate } from '../src/ui/save.js';
import { play } from '../sim/bot.js';
import { newGame, choose, view } from '../src/engine/game.js';

test('a save code round-trips a game mid-career and play continues identically', () => {
  let s = newGame({ seed: 5 });
  for (const id of ['go', 'ranks', 'press', 'firm']) s = choose(s, { type: 'setup', id });
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

test('a game saved before letters, goals and arcs existed plays on to the end', async () => {
  const { choose: ch } = await import('../src/engine/game.js');
  const { pick, POLICIES } = await import('../sim/bot.js');
  const portMove = (x) => (view(x).port.actions.find((a) => !a.locked && ['volunteers', 'press', 'quota'].includes(a.id)) || { id: 'sail' }).id;
  // Play into Act 3, then strip everything the newer build added.
  let s = play(21, { policy: 'fair', each: () => {} });
  let t = newGame({ seed: 21 });
  for (const id of ['go', 'shipmates', 'mixed', 'firm']) t = ch(t, { type: 'setup', id });
  let n = 0;
  while (!(t.phase === 'port' && t.act === 2) && t.phase !== 'ended' && n++ < 3000) {
    const v = view(t);
    const input = t.phase === 'port' ? { type: 'port', id: portMove(t) } : t.phase === 'sea' ? { type: 'advance' } : t.phase === 'decision' ? { type: 'option', id: pick(v.decision.options, POLICIES.fair.prefer) } : t.phase === 'battle' ? { type: 'battle', id: v.battle.phase === 'done' ? 'continue' : pick(v.battle.options, POLICIES.fair.prefer) } : t.phase === 'report' ? { type: 'report' } : { type: 'interlude', id: v.interlude.options[0].id };
    t = ch(t, input);
  }
  if (t.phase === 'ended') return; // this seed's career ended early; nothing to migrate
  const old = JSON.parse(JSON.stringify(t));
  delete old.rival; delete old.later; delete old.freshNews; delete old.port.mail;
  for (const k of Object.keys(old.flags)) if (/^(arc:|family:|patron:|commissionsDone)/.test(k)) delete old.flags[k];
  assert.ok(view(old).port, 'an old save in port does not render');
  n = 0;
  let o = old;
  while (o.phase !== 'ended' && n++ < 3000) {
    const v = view(o);
    const input = o.phase === 'port' ? { type: 'port', id: portMove(o) } : o.phase === 'sea' ? { type: 'advance' } : o.phase === 'decision' ? { type: 'option', id: pick(v.decision.options, POLICIES.fair.prefer) } : o.phase === 'battle' ? { type: 'battle', id: v.battle.phase === 'done' ? 'continue' : pick(v.battle.options, POLICIES.fair.prefer) } : o.phase === 'report' ? { type: 'report' } : { type: 'interlude', id: v.interlude.options[0].id };
    o = ch(o, input);
  }
  assert.equal(o.phase, 'ended', 'the old save did not reach an ending');
  assert.ok(s);
});
