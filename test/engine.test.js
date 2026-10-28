// Invariants: things that must never happen, whatever the balance.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame, choose, view } from '../src/engine/game.js';
import { play, POLICIES } from '../sim/bot.js';
import { crewTotal } from '../src/engine/derive.js';

const SEEDS = [1, 2, 3, 4, 5, 6, 7, 8];
const PHASES = new Set(['port', 'sea', 'decision', 'battle', 'report', 'interlude', 'ended']);

function invariants(s, where) {
  assert.ok(PHASES.has(s.phase), `${where}: unknown phase ${s.phase}`);
  for (const [k, n] of Object.entries(s.crew.groups)) assert.ok(Number.isInteger(n) && n >= 0, `${where}: group ${k} = ${n}`);
  for (const [k, x] of Object.entries(s.crew.drivers)) assert.ok(x >= 0 && x <= 100, `${where}: driver ${k} = ${x}`);
  for (const k of ['discipline', 'grievance', 'health']) assert.ok(s.crew[k] >= 0 && s.crew[k] <= 100, `${where}: ${k} = ${s.crew[k]}`);
  assert.ok(s.ship.hull >= 0 && s.ship.hull <= 100, `${where}: hull ${s.ship.hull}`);
  assert.ok(Number.isFinite(s.money), `${where}: money ${s.money}`);
  assert.ok(crewTotal(s) >= 0);
  if (s.phase === 'decision') assert.ok(s.pending, `${where}: decision phase with nothing pending`);
  if (s.phase === 'battle') assert.ok(s.battle, `${where}: battle phase with no battle`);
}

test('same seed and policy give the same career, byte for byte', () => {
  for (const p of ['fair', 'harsh']) {
    const a = JSON.stringify(play(11, { policy: p }));
    const b = JSON.stringify(play(11, { policy: p }));
    assert.equal(a, b, `policy ${p} is not deterministic`);
  }
});

test('choose() never mutates the state it is given', () => {
  const s = newGame({ seed: 3 });
  const before = JSON.stringify(s);
  choose(s, { type: 'port', id: 'press' });
  choose(s, { type: 'orders', key: 'drill', value: 'gunnery' });
  assert.equal(JSON.stringify(s), before);
});

test('every policy finishes every career, and the invariants hold at every step', () => {
  for (const p of Object.keys(POLICIES)) {
    for (const seed of SEEDS) {
      let lastDay = -Infinity;
      const s = play(seed, {
        policy: p,
        each: (x) => {
          invariants(x, `${p}/${seed} ${x.day}`);
          assert.ok(x.day >= lastDay, `${p}/${seed}: the clock ran backwards`);
          lastDay = x.day;
        },
      });
      assert.equal(s.phase, 'ended', `${p}/${seed} did not end (${s.botSteps} steps)`);
      assert.ok(s.turn > 0, `${p}/${seed}: the clock never moved`);
      assert.equal(s.record.fallbacks, 0, `${p}/${seed}: the bot met ${s.record.fallbacks} decisions its policy does not answer`);
    }
  }
});

test('the purse equals the ledger (one money chokepoint)', () => {
  for (const seed of SEEDS) {
    const s = play(seed, { policy: 'drilled' });
    const sum = s.ledger.reduce((a, l) => a + l.amount, 0);
    assert.equal(s.money, sum, `seed ${seed}: purse ${s.money} vs ledger ${sum}`);
  }
});

test('the view has every screen the phase needs, with no raw tokens', () => {
  const bad = /\{[a-z_.]+\}|\bundefined\b|\bNaN\b|\[object Object\]/;
  for (const seed of [1, 2, 3]) {
    play(seed, {
      policy: 'fair',
      each: (s) => {
        const v = view(s);
        const need = { port: 'port', decision: 'decision', battle: 'battle', report: 'report', interlude: 'interlude', ended: 'ending' }[s.phase];
        if (need) assert.ok(v[need], `phase ${s.phase} has no ${need} in the view`);
        const text = JSON.stringify({ d: v.decision, b: v.battle, r: v.report, i: v.interlude, e: v.ending, n: v.named, p: v.port });
        assert.ok(!bad.test(text), `raw token in view at ${v.date}: ${text.match(bad)}`);
      },
    });
  }
});

test('bad input is refused, not absorbed', () => {
  const s = newGame({ seed: 1 });
  assert.throws(() => choose(s, { type: 'advance' }), /advance in phase port/);
  assert.throws(() => choose(s, { type: 'orders', key: 'drill', value: 'cannonade' }));
  assert.throws(() => choose(s, { type: 'warp' }));
});

test('a locked port action does nothing', () => {
  const s = newGame({ seed: 1 });
  const v = view(s);
  const quota = v.port.actions.find((a) => a.id === 'quota');
  assert.ok(quota.locked, 'quota men should be locked before 1795');
  const after = choose(s, { type: 'port', id: 'quota' });
  assert.equal(crewTotal(after), crewTotal(s));
});
