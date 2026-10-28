// Batch runner: whole careers, by policy, with the brief's three tests of success
// (section 10). Usage: node sim/run.js [runs=200] [policy ...]
//   1. A harsh captain and a fair captain have different careers.
//   2. A captain who drills hard wins fights a lazy captain loses.
//   3. Runs end differently.
// It refuses to report a run that did not progress (F11).

import { play, POLICIES } from './bot.js';
import { runBatch } from './harness.js';
import { view } from '../src/engine/game.js';
import { yearOf } from '../src/engine/calendar.js';

export function progress(s) {
  const miss = [];
  if (s.phase !== 'ended') miss.push(`never ended (phase ${s.phase} after ${s.botSteps} steps)`);
  if (s.turn < 1) miss.push('the clock never moved');
  if (s.ending?.kind === 'peace' && s.record.weeksAtSea < 40) miss.push(`survived to the peace with only ${s.record.weeksAtSea} weeks at sea`);
  return miss;
}

export function metrics(s) {
  const v = view(s);
  const k = s.ending.kind;
  return {
    survived: k === 'peace',
    killed: k === 'killed',
    murdered: k === 'mutiny',
    dismissed: k === 'dismissed',
    debt: k === 'debt',
    madePost: s.player.rank === 'captain',
    mutinied: s.record.mutinies > 0,
    lostAShip: s.record.shipsLost > 0,
    score: v.ending.score.total,
    yearEnded: yearOf(s.day),
    actions: s.record.actions,
    won: s.record.won,
    winShare: s.record.actions ? s.record.won / s.record.actions : 0,
    prizes: s.record.prizes,
    money: s.money,
    lashesPer100yr: v.career.lashRate,
    serviceRep: s.player.rep.service,
    menLost: s.record.killed + s.record.died + s.record.deserted,
    fallbacks: s.record.fallbacks,
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const runs = Number(process.argv[2] || 200);
  const pols = process.argv.slice(3).length ? process.argv.slice(3) : Object.keys(POLICIES);
  let failed = false;
  for (const p of pols) {
    const r = runBatch({ runs, seed0: 1, opts: { policy: p }, play, progress, metrics, label: `policy ${p}` });
    console.log(r.report + '\n');
    failed ||= r.failed;
  }
  process.exit(failed ? 1 : 0);
}
