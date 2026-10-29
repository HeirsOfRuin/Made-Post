// Score and obituary (brief section 8). Both read only the final state.

import { formatDay, yearOf } from './calendar.js';
import { lashRate, conductLabel, round1 } from './derive.js';
import { BACKGROUNDS } from '../data/cast.data.js';

export const ENDINGS = {
  peace: 'Survived the war',
  killed: 'Killed in action',
  mutiny: 'Murdered by his crew',
  dismissed: 'Dismissed the service',
  debt: 'Ruined by debt',
};

export function rankTitle(s) {
  if (s.player.rank !== 'captain') return 'Commander';
  if (s.player.postList === 0) return 'Rear-Admiral';
  return 'Captain';
}

/** Six parts, each shown with its value, so the score explains itself. */
export function score(s) {
  const r = s.record;
  const p = s.player;
  const parts = {
    rank: p.rank !== 'captain' ? 10 : p.postList === 0 ? 70 : 30 + Math.round((520 - Math.min(520, p.postList)) / 10),
    wealth: Math.round(Math.max(-20, Math.min(40, s.money / 250))),
    reputation: Math.round((p.rep.service + p.rep.public) / 4),
    record: r.won * 4 + r.prizes * 2 - r.shipsLost * 10 - r.fled * 2,
    people: s.followers.length * 5 - Math.round((r.killed + r.died) / 20),
    conduct: (lashRate(s) < 40 ? 10 : lashRate(s) < 120 ? 5 : lashRate(s) < 260 ? 0 : -10) - 10 * r.mutinies,
  };
  if (s.ending && s.ending.kind !== 'peace') parts.rank = Math.round(parts.rank / 2);
  const total = Object.values(parts).reduce((a, b) => a + b, 0);
  return { parts, total };
}

/** A Naval Chronicle notice, built from state. */
export function obituary(s) {
  const p = s.player;
  const r = s.record;
  const bg = BACKGROUNDS[p.background];
  const born = yearOf(s.day) - (28 + (yearOf(s.day) - 1794));
  const out = [];
  const end = s.ending ? s.ending.kind : 'peace';
  out.push(`${p.name.toUpperCase()}${p.rank === 'captain' ? ', R.N.' : ''}`);
  out.push(`${bg.label === 'Up from the lower deck' ? 'Entered the service before the mast, and came aft by merit, which is seldom seen.' : bg.label === 'Naval family' ? 'Of a naval family, and entered the service young under his father\'s friends.' : 'A younger son of a gentleman\'s family, entered the service young.'} Born about ${born}.`);
  out.push(p.rank === 'captain'
    ? `Made post on ${formatDay(p.postDay)}${p.postList === 0 ? ', and by 1815 stood high enough on the list to be advanced to his flag in course' : `, and stood ${p.postList > 0 ? `${p.postList} places from the head of the list` : 'near the head of the list'} at the peace`}.`
    : 'He was never made post.');
  const deeds = [];
  if (r.won) deeds.push(`${r.won} action${r.won > 1 ? 's' : ''} fought and won`);
  if (r.prizes) deeds.push(`${r.prizes} prize${r.prizes > 1 ? 's' : ''} sent in`);
  if (r.shipsLost) deeds.push(`${r.shipsLost} ship${r.shipsLost > 1 ? 's' : ''} lost`);
  out.push(deeds.length ? `His service: ${deeds.join(', ')}.` : 'His service was long and unremarked, as most was.');
  out.push(`In command he was ${conductLabel(s)} (${r.lashes} lashes ordered in ${Math.round(r.weeksAtSea)} weeks at sea${r.overRegulation ? `, ${r.overRegulation} times beyond the dozen the regulations allow` : ''}). ${r.killed + r.died} men died under his command, ${r.killed} of them in action.`);
  if (r.mutinies) out.push(`His ship${r.mutinies > 1 ? 's' : ''} mutinied ${r.mutinies === 1 ? 'once' : `${r.mutinies} times`}.`);
  if (s.followers.length) out.push(`Officers who owed their promotion to him: ${s.followers.join(', ')}.`);
  const fin = {
    peace: `He went ashore at the peace with £${Math.max(0, s.money)} ${s.money > 5000 ? 'in prize money, a rich man' : 'and his half pay'}.`,
    killed: `He fell in action on ${formatDay(s.day)}.`,
    mutiny: `He was killed by his own people on ${formatDay(s.day)}.`,
    dismissed: `He was dismissed the service by sentence of a court-martial on ${formatDay(s.day)}.`,
    debt: `He died in the Fleet prison for debt, having been on half pay with creditors he could not satisfy.`,
  }[end];
  out.push(fin);
  return out;
}

export { round1 };
