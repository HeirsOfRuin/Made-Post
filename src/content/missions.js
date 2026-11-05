// What each kind of voyage is for, and what a captain can do about it.
//
// The author's playtest: "the actions for my ship were the same whether I was
// cruising or blockading" and "the missions dealt repetitive". Each order type
// now has its own goal, shown with its progress on the sea screen and judged
// in the admiral's report, and its own set of actions. Every action is read by
// week.js (run) and every lock says why (rule 6).

import { CONFIG } from '../data/config.data.js';
import { ENEMIES } from '../data/ships.data.js';
import { ORDER_TYPES, COURSES } from '../data/orders.data.js';
import { clamp, checkChance, effective, morale, manning, captainShare } from '../engine/derive.js';
import { money, log } from '../engine/state.js';
import { removeMen } from '../engine/battle.js';

// ---- goals ---------------------------------------------------------------------

/** The goal set when the voyage begins. Numbers drawn once and kept in state. */
export function makeGoal(orders, weeks, rng) {
  switch (orders) {
    case 'cruise': return { kind: 'prizes', target: Math.max(2, Math.round(weeks / 4)) };
    case 'blockade': return { kind: 'watch', target: Math.max(2, Math.round(weeks / 4)) };
    case 'convoy': return { kind: 'convoy', size: rng.range(14, 30) };
    case 'dispatches': return { kind: 'speed', due: weeks };
    default: return null;
  }
}

/** Progress in a short line, and whether the goal is met so far. */
export function goalStatus(s) {
  const c = s.commission;
  const g = c && c.goal;
  if (!g) return null;
  switch (g.kind) {
    case 'prizes': {
      const n = s.record.prizes - c.startRecord.prizes;
      return { line: `Prizes taken: ${n} of the ${g.target} your owners and crew hope for`, met: n >= g.target, short: `${n} of ${g.target} prizes` };
    }
    case 'watch': {
      const n = c.recon || 0;
      return { line: `Looks into the harbour: ${n} of the ${g.target} the admiral expects`, met: n >= g.target, short: `${n} of ${g.target} looks` };
    }
    case 'convoy': {
      const safe = g.size - c.convoyLost;
      return { line: `Convoy: ${safe} of ${g.size} ships safe`, met: c.convoyLost === 0, short: `${safe} of ${g.size} safe` };
    }
    case 'speed': {
      const ahead = g.due - c.weeks;
      return { line: ahead > 0 ? `Dispatches: ${ahead} week${ahead > 1 ? 's' : ''} ahead of time` : ahead < 0 ? `Dispatches: ${-ahead} week${ahead < -1 ? 's' : ''} late` : 'Dispatches: on time so far', met: ahead >= 0, short: ahead > 0 ? `${ahead} wk ahead` : ahead < 0 ? `${-ahead} wk late` : 'on time' };
    }
    default: return null;
  }
}

// ---- actions -------------------------------------------------------------------

const inshoreOnly = (s) => (s.commission.course !== 'inshore' ? 'Only when sailing inshore.' : null);
const cooldown = (s, id) => {
  const n = (s.commission.cool || {})[id] || 0;
  return n ? `Not again for ${n} week${n === 1 ? '' : 's'}.` : null;
};

/**
 * Actions by order type. run(s, rng, notes) happens during the week; tags let
 * the reference bot choose. cool = weeks before it can be used again.
 */
export const ACTIONS = {
  raid: {
    label: 'Boat raid', orders: ['cruise', 'blockade'], cool: 4, tags: ['bold'],
    hint: 'Send the boats into an enemy harbour at night to cut out a ship at anchor. A prize if it works; men lost if it does not.',
    lock: (s) => inshoreOnly(s) || (manning(s) < 0.6 ? 'Too few men to spare for the boats.' : null),
    run: (s, rng, notes) => {
      const c = s.commission;
      const course = COURSES[c.course] || COURSES.patrol;
      const p = checkChance((effective(s).seamanship + morale(s)) / 2, 55);
      if (rng.chance(p)) {
        const value = Math.round(rng.range(ENEMIES.merchant.prize[0], ENEMIES.merchant.prize[1]) * course.prizeValue * 1.2);
        addPrize(s, 'French coaster, cut out of harbour', value);
        removeMen(s, 4);
        s.crew.drivers.prospects = clamp(s.crew.drivers.prospects + 8);
        s.crew.drivers.trust = clamp(s.crew.drivers.trust + 4);
        s.player.rep.service = clamp(s.player.rep.service + 2);
        notes.push(`The boats cut a French coaster out of the harbour under the batteries' noses. Worth about £${Math.round(value / 100) * 100}.`);
        log(s, 'Boat raid: a coaster cut out of harbour.', 'battle');
      } else {
        const lost = rng.range(3, 9);
        removeMen(s, lost);
        s.record.killed += lost;
        s.crew.drivers.trust = clamp(s.crew.drivers.trust - 5);
        notes.push(`The raid was seen. The boats came back under fire; ${lost} men did not.`);
        log(s, `Boat raid beaten off: ${lost} men lost.`, 'battle');
      }
    },
  },
  neutrals: {
    label: 'Stop neutrals', orders: ['cruise'], cool: 2, tags: ['fair', 'obey'],
    hint: 'Stop and question neutral merchant ships for news of enemy shipping. Next week you are more likely to find something.',
    lock: () => null,
    run: (s, rng, notes) => {
      s.commission.intel = 1.6;
      notes.push('A Danish master, given a glass of wine, mentions French ships loading at the next port along the coast.');
    },
  },
  look: {
    label: 'Look in', orders: ['blockade'], cool: 1, tags: ['obey', 'fair', 'bold'],
    hint: 'Stand in close under the shore batteries to count the ships in the harbour, as the admiral expects. Easier from inshore.',
    lock: () => null,
    run: (s, rng, notes) => {
      const c = s.commission;
      const p = checkChance(effective(s).seamanship + (c.course === 'inshore' ? 10 : c.course === 'offshore' ? -10 : 0), 50);
      if (rng.chance(p)) {
        c.recon = (c.recon || 0) + 1;
        s.player.rep.service = clamp(s.player.rep.service + 1);
        notes.push(`You stood in under the batteries and counted the ships in the harbour: ${rng.range(14, 22)} of the line, ${rng.range(4, 9)} frigates, all still at anchor. Your report goes to the admiral.`);
      } else {
        const dmg = rng.range(5, 12);
        s.ship.hull = clamp(s.ship.hull - dmg);
        const hurt = rng.range(0, 3);
        if (hurt) { removeMen(s, hurt); s.record.killed += hurt; }
        notes.push(`The batteries found the range before you could see into the harbour (hull -${dmg}${hurt ? `, ${hurt} killed` : ''}). Nothing to report.`);
      }
    },
  },
  fishing: {
    label: 'Fishing boats', orders: ['blockade'], cool: 3, tags: ['care', 'cheap'],
    hint: 'Buy fish and gossip from the French fishing boats, which both navies usually let alone. Fresh food for the men, and sometimes news. Costs £10.',
    lock: (s) => (s.money < 10 ? 'You cannot spare £10.' : null),
    run: (s, rng, notes) => {
      money(s, -10, 'Fish from the French fishing boats');
      s.crew.drivers.provisions = clamp(s.crew.drivers.provisions + 6);
      s.flags.freshFood = true;
      if (rng.chance(0.4)) { s.commission.intel = 1.5; notes.push('Fresh fish for the mess, and a fisherman says a squadron is getting ready to sail.'); } else notes.push('Fresh fish for every mess. The men eat well for once.');
    },
  },
  gather: {
    label: 'Gather convoy', orders: ['convoy'], cool: 2, tags: ['obey', 'fair', 'care'],
    hint: 'Spend the week chasing stragglers back into line and keeping the convoy close. For two weeks, a privateer cannot pick off a ship.',
    lock: () => null,
    run: (s, rng, notes) => {
      s.commission.guard = 2;
      s.crew.drivers.workload = clamp(s.crew.drivers.workload - 3);
      notes.push('You worked up and down the convoy all week, firing guns at the slow and the careless. They are close and in order.');
    },
  },
  scout: {
    label: 'Range ahead', orders: ['convoy'], cool: 2, tags: ['bold', 'initiative'],
    hint: 'Sail ahead of the convoy to find trouble before it finds you. You are more likely to meet the enemy, on your terms.',
    lock: () => null,
    run: (s, rng, notes) => {
      s.commission.intel = 1.5;
      notes.push('You ranged ahead of the convoy at dawn and dusk, looking for strange sails.');
    },
  },
  crack: {
    label: 'Crack on', orders: ['dispatches'], cool: 2, tags: ['bold', 'obey'],
    hint: 'Carry every stitch of sail, day and night, to arrive a week sooner. Masts and sails may not stand it.',
    lock: (s) => (s.commission.weeks - s.commission.week <= 2 ? 'Too close to port to gain a week.' : null),
    run: (s, rng, notes) => {
      const c = s.commission;
      if (rng.chance(checkChance(effective(s).seamanship, 50))) {
        c.weeks = Math.max(c.week + 2, c.weeks - 1);
        notes.push('She flew: eleven knots for days on end. A week saved.');
      } else {
        s.ship.rigging = clamp(s.ship.rigging - 15);
        notes.push('The fore-topmast carried away in a squall. Nothing gained, and the carpenter is busy.');
      }
    },
  },
  rest: {
    label: 'Rest day', orders: ['cruise', 'blockade', 'convoy', 'dispatches'], cool: 0, tags: ['care', 'lenient'],
    hint: 'A make-and-mend day: no training this week, and the men get some rest.',
    lock: () => null,
    run: (s, rng, notes) => {
      s.crew.drivers.workload = clamp(s.crew.drivers.workload + 8);
      s.crew.drivers.trust = clamp(s.crew.drivers.trust + 1);
      notes.push('You gave the men a rest day: no training, mended clothes, a quiet deck.');
    },
  },
  home: {
    label: 'Return home', orders: ['cruise'], cool: 0, tags: ['cautious'],
    hint: 'End the cruise early and sail for port. Prize money is paid when you arrive.',
    lock: (s) => (s.commission.tutorial ? 'Not on your first cruise.' : s.commission.week < Math.ceil(s.commission.weeks / 2) ? `Not before week ${Math.ceil(s.commission.weeks / 2)} of the cruise.` : null),
    run: () => {},
  },
};

/** The actions this voyage offers, each with its lock reason. */
export function seaActions(s) {
  const c = s.commission;
  if (!c) return [];
  return Object.entries(ACTIONS)
    .filter(([, a]) => a.orders.includes(c.orders))
    .map(([id, a]) => ({ id, label: a.label, hint: a.hint, tags: a.tags, locked: cooldown(s, id) || a.lock(s) }));
}

/** Run the planned action, then count down every cooldown. */
export function runAction(s, rng, notes) {
  const c = s.commission;
  c.cool = c.cool || {};
  for (const k of Object.keys(c.cool)) if (c.cool[k] > 0) c.cool[k]--;
  const id = c.plan;
  if (!id || !ACTIONS[id]) return;
  ACTIONS[id].run(s, rng, notes);
  if (ACTIONS[id].cool) c.cool[id] = ACTIONS[id].cool;
}

/** A prize taken outside a battle (raids, recaptures): shares by the same rule. */
export function addPrize(s, name, value) {
  const share = Math.round(value * captainShare(s, ORDER_TYPES[s.commission.orders].flagShare));
  s.prizesPending.push({ name, value, share, burnt: false });
  s.record.prizes++;
  s.record.prizeValue += value;
}

export { CONFIG };
