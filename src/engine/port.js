// Fitting out (brief section 5, step 2). Each action lists its effects and the
// reason it is locked, so a greyed button always says why (rule 6).

import { CONFIG } from '../data/config.data.js';
import { dayOf } from './calendar.js';
import { clamp, crewTotal, complement, manning, baseSkill } from './derive.js';
import { money, log, officer } from './state.js';
import { streamFor } from './rng.js';

const QUOTA_DAY = dayOf('1795-03-05'); // the first Quota Act

function room(s) {
  return Math.max(0, complement(s) - crewTotal(s));
}

/** Volunteers come in proportion to your name among the men (brief 6.6). */
export function volunteerYield(s) {
  return Math.min(room(s), Math.round(complement(s) * 0.12 * (0.4 + s.player.rep.men / 60)));
}
export function pressYield(s) {
  return Math.min(room(s), Math.round(complement(s) * 0.3));
}
export function quotaYield(s) {
  return Math.min(room(s), Math.round(complement(s) * 0.15));
}

export function portActions(s) {
  const done = s.port.done;
  const followers = s.officers.filter((o) => (o.post === 'mid1' || o.post === 'mid2') && o.status === 'aboard' && o.competence >= 50);
  const minManning = 0.5;
  return [
    {
      id: 'volunteers', label: 'Recruit volunteers',
      note: `About ${volunteerYield(s)} willing seamen, more if sailors think well of you. Costs £25.`,
      locked: done.volunteers ? 'Done this time in port.' : !room(s) ? 'The ship is fully manned.' : s.money < 25 ? 'You cannot afford the £25.' : null,
    },
    {
      id: 'press', label: 'Send the press gang out',
      note: `About ${pressYield(s)} men taken by force. Quick, but they did not choose to come, and unrest grows.`,
      locked: done.press ? 'Done this time in port.' : !room(s) ? 'The ship is fully manned.' : null,
    },
    {
      id: 'quota', label: 'Take men sent by the counties',
      note: `About ${quotaYield(s)} men the counties must send under the Quota Acts. Willing, but they have never been to sea.`,
      locked: done.quota ? 'Done this time in port.' : s.day < QUOTA_DAY ? 'The first Quota Act is not passed until March 1795.' : !room(s) ? 'The ship is fully manned.' : null,
    },
    {
      id: 'powder', label: `Buy 10 barrels of powder for practice (£${10 * CONFIG.powderPerBarrel})`,
      note: `Extra powder for gun practice, from your own pocket. You have ${Math.round(s.ship.stores.powder)} barrels; gun training uses ${CONFIG.drill.gunnery.powder} a week.`,
      locked: (done.powder || 0) >= 3 ? 'The ordnance wharf will sell you no more this time.' : s.money < 10 * CONFIG.powderPerBarrel ? `You cannot afford £${10 * CONFIG.powderPerBarrel}.` : null,
    },
    {
      id: 'liberty', label: 'Give the men shore leave',
      note: 'The men rest and think better of you. Some will not come back, especially pressed men, and more if the ship is unhappy.',
      locked: done.liberty ? 'Done this time in port.' : null,
    },
    {
      id: 'recommend', label: 'Recommend a midshipman for lieutenant',
      note: followers.length ? `${followers[0].name} is ready. Uses some of your influence; he will be loyal to you for life, and it counts to your credit.` : 'None of your midshipmen is ready yet.',
      locked: done.recommend ? 'Done this time in port.' : !followers.length ? 'No midshipman is ready.' : s.player.interest < 10 ? 'You do not have enough influence to get anyone promoted.' : null,
    },
    {
      id: 'sail', label: 'Put to sea',
      note: `Crew: ${crewTotal(s)} of ${complement(s)}.`,
      locked: manning(s) < minManning ? `Too few men to sail her: you have ${crewTotal(s)} and need at least ${Math.ceil(complement(s) * minManning)}.` : null,
      primary: true,
    },
  ];
}

/** Mix new men into the crew's trained skill: new hands dilute it. */
function dilute(s, before) {
  const after = crewTotal(s);
  if (after <= before) return;
  const base = baseSkill(s);
  const w = before / after;
  s.crew.skill.seamanship = Math.round(s.crew.skill.seamanship * w + base.seamanship * (1 - w));
  s.crew.skill.gunnery = Math.round(s.crew.skill.gunnery * w + base.gunnery * 0.8 * (1 - w));
}

export function portChoose(s, id) {
  const a = portActions(s).find((x) => x.id === id);
  if (!a) throw new Error(`no port action ${id}`);
  if (a.locked) return false;
  const rng = streamFor(s.seed, s.turn, `port:${id}`);
  const g = s.crew.groups;
  const before = crewTotal(s);
  s.port.done[id] = (s.port.done[id] || 0) + 1;
  switch (id) {
    case 'volunteers': {
      const n = volunteerYield(s);
      const able = Math.round(n * 0.4);
      g.able += able; g.ordinary += n - able;
      money(s, -25, 'Rendezvous for volunteers');
      log(s, `${n} volunteers entered.`, 'crew');
      break;
    }
    case 'press': {
      const n = pressYield(s);
      g.pressed += n;
      s.crew.grievance = clamp(s.crew.grievance + 5);
      log(s, `The press brought in ${n} men.`, 'crew');
      break;
    }
    case 'quota': {
      const n = quotaYield(s);
      g.landsmen += n;
      log(s, `${n} quota men came aboard.`, 'crew');
      break;
    }
    case 'powder':
      s.ship.stores.powder += 10;
      money(s, -10 * CONFIG.powderPerBarrel, 'Powder for practice');
      break;
    case 'liberty': {
      const d = s.crew.drivers;
      d.workload = clamp(d.workload + 12);
      d.trust = clamp(d.trust + 3);
      const unhappy = d.fairness < 40 || d.trust < 40 ? 2 : 1;
      let ran = 0;
      for (const [k, p] of [['pressed', 0.08], ['able', 0.02], ['ordinary', 0.02]]) {
        let n = 0;
        for (let i = 0; i < g[k]; i++) if (rng.next() < p * unhappy) n++;
        g[k] -= n; ran += n;
      }
      s.record.deserted += ran;
      log(s, `Liberty. ${ran ? `${ran} men did not come back.` : 'Every man came back.'}`, 'crew');
      break;
    }
    case 'recommend': {
      const mid = s.officers.find((o) => (o.post === 'mid1' || o.post === 'mid2') && o.status === 'aboard' && o.competence >= 50);
      mid.status = 'promoted';
      s.followers.push(mid.name.replace(/^Mr /, ''));
      s.record.promoted++;
      s.player.interest = clamp(s.player.interest - 6);
      s.player.rep.service = clamp(s.player.rep.service + 1);
      const fresh = { ...mid, name: `Mr ${['Edward', 'Harry', 'Philip', 'Arthur'][rng.int(4)]} ${['Coyle', 'Tremayne', 'Huxley', 'Barrow'][rng.int(4)]}`, competence: rng.range(20, 60), status: 'aboard' };
      s.officers.push(fresh);
      log(s, `${mid.name} passed for lieutenant on your recommendation.`, 'career');
      break;
    }
    default:
      break;
  }
  dilute(s, before);
  return true;
}

export { officer };
