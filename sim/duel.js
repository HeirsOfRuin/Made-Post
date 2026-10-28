// Single-ship actions through the real resolver (battle.js), with the crew's
// skill set directly. Answers the brief's third test: does drill beat size?
// Usage: node sim/duel.js [runs=400]

import { newGame } from '../src/engine/game.js';
import { startBattle, battleChoose, closeBattle } from '../src/engine/battle.js';
import { assignShip } from '../src/engine/state.js';
import { makeRng } from '../src/engine/rng.js';
import { SHIP_CLASSES } from '../src/data/ships.data.js';
import { seRate } from './harness-stats.js';

export const PLANS = {
  steady: { approach: 'gauge', engage: 'close', decide: 'pound', after: 'prize' },
  long: { approach: 'gauge', engage: 'long', decide: 'pound', after: 'prize' },
  rake: { approach: 'gauge', engage: 'rake', decide: 'pound', after: 'prize' },
  board: { approach: 'gauge', engage: 'close', decide: 'board', after: 'prize' },
};

/** One fight: our class and trained skill against an enemy type. */
export function duel(seed, { cls, gunnery, seamanship, morale = 60, enemy, plan = PLANS.steady }) {
  const s = newGame({ seed });
  const rng = makeRng(seed * 31 + 7);
  assignShip(s, cls, rng);
  const c = SHIP_CLASSES[cls];
  const g = s.crew.groups;
  g.able = Math.round(c.complement * 0.35); g.ordinary = Math.round(c.complement * 0.4); g.landsmen = Math.round(c.complement * 0.05);
  g.pressed = Math.round(c.complement * 0.08); g.marines = c.complement - g.able - g.ordinary - g.landsmen - g.pressed;
  s.crew.skill = { gunnery, seamanship };
  for (const k of Object.keys(s.crew.drivers)) s.crew.drivers[k] = morale;
  s.crew.discipline = 60;
  s.commission = { orders: 'cruise', departed: false, week: 0, weeks: 10 };
  startBattle(s, enemy, rng);
  const order = { approach: plan.approach, engage: plan.engage, decide: plan.decide, aftermath: plan.after };
  let guard = 0;
  while (s.battle.phase !== 'done' && guard++ < 10) battleChoose(s, order[s.battle.phase], rng);
  const b = s.battle;
  const lostShare = 1 - b.own.crewNow / b.own.crewStart;
  const result = closeBattle(s, rng);
  return { result, lostShare };
}

export function rate(runs, spec) {
  const n = { won: 0, lost: 0, killed: 0, other: 0 };
  let loss = 0;
  for (let i = 0; i < runs; i++) {
    const r = duel(1000 + i * 7919, spec);
    n[r.result === 'won' ? 'won' : r.result === 'lost' ? 'lost' : r.result === 'killed' ? 'killed' : 'other']++;
    loss += r.lostShare;
  }
  return { won: n.won / runs, lost: n.lost / runs, killed: n.killed / runs, casualties: loss / runs };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const runs = Number(process.argv[2] || 400);
  const pct = (x) => `${(100 * x).toFixed(0).padStart(3)}%`;
  console.log(`Single-ship actions, ${runs} per cell, plan "close and pound". 1 SE on a rate near 50% is ±${seRate(0.5, runs).toFixed(1)} pts.`);
  console.log('crew skill: lazy = gunnery 35 / seamanship 45, fair = 55/55, drilled = 85/65\n');
  const crews = { lazy: [35, 45], fair: [55, 55], drilled: [85, 65] };
  const pairs = [['sloop', 'privateer'], ['frigate32', 'privateer'], ['frigate32', 'spanish'], ['frigate32', 'french'], ['frigate38', 'french'], ['frigate38', 'american'], ['frigate40', 'american']];
  console.log('ship        enemy      | lazy won/lost/killed  | fair won/lost/killed  | drilled won/lost/killed');
  for (const [cls, enemy] of pairs) {
    const row = Object.entries(crews).map(([, [gunnery, seamanship]]) => {
      const r = rate(runs, { cls, enemy, gunnery, seamanship });
      return `${pct(r.won)} ${pct(r.lost)} ${pct(r.killed)}  cas ${pct(r.casualties)}`;
    });
    console.log(`${cls.padEnd(11)} ${enemy.padEnd(10)} | ${row.join(' | ')}`);
  }
  console.log('\nPlans, fair crew, 38 v French frigate:');
  for (const [name, plan] of Object.entries(PLANS)) {
    const r = rate(runs, { cls: 'frigate38', enemy: 'french', gunnery: 55, seamanship: 55, plan });
    console.log(`  ${name.padEnd(8)} won ${pct(r.won)} lost ${pct(r.lost)} killed ${pct(r.killed)} casualties ${pct(r.casualties)}`);
  }
  console.log('\nThe Shannon test: drilled 32 (smaller) against what a lazy 38 faces:');
  for (const enemy of ['french', 'spanish', 'american']) {
    const small = rate(runs, { cls: 'frigate32', enemy, gunnery: 85, seamanship: 65 });
    const big = rate(runs, { cls: 'frigate38', enemy, gunnery: 35, seamanship: 45 });
    console.log(`  v ${enemy.padEnd(9)} drilled 32 won ${pct(small.won)}   lazy 38 won ${pct(big.won)}`);
  }
}
