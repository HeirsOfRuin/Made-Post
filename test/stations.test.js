// Tier 3: distant stations, declining a posting, raids as scenes, weather, art.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ACTS, SUPERIORS } from '../src/data/acts.data.js';
import { ALTERNATIVES, DISTANT, WARS } from '../src/data/stations.data.js';
import { ENEMIES } from '../src/data/ships.data.js';
import { distantDef } from '../src/engine/career.js';
import { dayOf } from '../src/engine/calendar.js';
import { play, POLICIES } from '../sim/bot.js';
import { view } from '../src/engine/game.js';
import { shipSVG, enemyShape, nationOf } from '../src/ui/art.js';

const SEEDS = Array.from({ length: 30 }, (_, i) => 1 + i * 7919);

test('every distant posting has a real admiral and only enemies at war on its dates', () => {
  for (const act of ACTS) for (const c of act.commissions) {
    for (const key of ALTERNATIVES[c.id] || []) {
      const d = distantDef(c, key);
      assert.ok(SUPERIORS[d.superior], `${d.id}: no admiral ${d.superior}`);
      const day = dayOf(c.start);
      for (const k of Object.keys(d.enemies)) {
        assert.ok(ENEMIES[k], `${d.id}: unknown enemy ${k}`);
        if (WARS[k]) assert.ok(WARS[k].some(([a, b]) => day >= dayOf(a) && day <= dayOf(b)), `${d.id} meets ${k} outside the war`);
      }
    }
  }
  assert.ok(DISTANT.baltic && DISTANT.caribbean && DISTANT.eastindies);
});

test('distant stations pay more and kill more', () => {
  const asks = { ...POLICIES.fair, port: { ...POLICIES.fair.port, ask: ['eastindies', 'caribbean', 'baltic'] } };
  const home = { ...POLICIES.fair, port: { ...POLICIES.fair.port, ask: [] } };
  const med = (xs) => xs.sort((a, b) => a - b)[xs.length >> 1];
  const a = SEEDS.map((seed) => play(seed, { policy: asks }));
  const h = SEEDS.map((seed) => play(seed, { policy: home }));
  assert.ok(a.some((s) => s.log.some((l) => /request is granted/.test(l.text))), 'no request was ever granted');
  assert.ok(med(a.map((s) => s.record.died)) > med(h.map((s) => s.record.died)), 'distant service did not cost more men to sickness');
  assert.ok(med(a.map((s) => s.money)) > med(h.map((s) => s.money)), 'distant service did not pay better');
});

test('declining a posting costs influence and sends you home, and the career goes on', () => {
  const pol = { ...POLICIES.fair, port: { ...POLICIES.fair.port, decline: (v) => v.port.next && v.port.next.station === 'off Brest' } };
  let declined = 0;
  for (const seed of SEEDS.slice(0, 10)) {
    const s = play(seed, { policy: pol });
    assert.equal(s.phase, 'ended');
    if (s.flags.declined) { declined++; assert.ok(s.reports.some((r) => r.title === 'Posting declined')); }
  }
  assert.ok(declined > 0, 'no posting was ever declined');
});

test('a boat raid is a scene in two steps', () => {
  let approach = 0, strike = 0;
  for (const seed of SEEDS.slice(0, 15)) {
    play(seed, { policy: 'harsh', each: (s) => { if (s.phase === 'decision') { if (s.pending.id === 'raid-approach') approach++; if (s.pending.id === 'raid-strike') strike++; } } });
  }
  assert.ok(approach > 0 && strike > 0, `approach ${approach}, strike ${strike}`);
});

test('every fight has weather, and the battle screen says so', () => {
  const seen = new Set();
  for (const seed of SEEDS.slice(0, 10)) {
    play(seed, { policy: 'fair', each: (s) => { if (s.phase === 'battle' && s.battle) { seen.add(s.battle.weather); assert.ok(view(s).battle.weather); } } });
  }
  assert.ok(seen.has('calm') && seen.has('heavy') && seen.has('breeze'), `weather seen: ${[...seen]}`);
});

test('every ship and ensign draws without broken numbers', () => {
  for (const kind of Object.keys(ENEMIES)) {
    for (const year of [1795, 1805]) {
      const svg = shipSVG({ shape: enemyShape(kind), nation: nationOf(ENEMIES[kind].flag), year, rigging: 20, hull: 20, facing: 'left', smoke: true });
      assert.ok(svg.startsWith('<svg') && !/NaN|undefined/.test(svg), `${kind} ${year}`);
    }
  }
  for (const shape of ['sloop', 'frigate32', 'frigate38', 'frigate40']) assert.ok(!/NaN|undefined/.test(shipSVG({ shape, year: 1801 })));
  // The 1801 Union adds St Patrick's saltire.
  assert.notEqual(shipSVG({ shape: 'frigate38', year: 1800 }), shipSVG({ shape: 'frigate38', year: 1801 }));
});
