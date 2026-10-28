// Effects as data. Every event option and port action declares a list of ops;
// this module applies them and also describes them, so the "At stake" line
// under a choice is derived from what the choice actually does (design
// lesson: choices say what is at stake, computed from their real effects).

import { CONFIG } from '../data/config.data.js';
import { clamp, checkChance, band, effective, morale } from './derive.js';
import { money, log, officer } from './state.js';

export const SEVERITY = ['Admonished', 'Grog stopped', 'Extra duty and irons', 'Flogged, a dozen lashes', 'Flogged, three dozen lashes'];

export const OFFENCES = [
  { id: 'drunk', label: 'drunk on watch', gravity: 1.5, weight: 5 },
  { id: 'neglect', label: 'neglect of duty', gravity: 1, weight: 5 },
  { id: 'insolence', label: 'insolence to a petty officer', gravity: 2, weight: 3 },
  { id: 'fighting', label: 'fighting', gravity: 2, weight: 3 },
  { id: 'theft', label: 'theft from a messmate', gravity: 2.5, weight: 2 },
  { id: 'desertion', label: 'attempting to desert', gravity: 3, weight: 1 },
];

/** Severity a standing policy gives an offence of this gravity. */
export function policySeverity(policy, gravity) {
  return Math.round(clamp(gravity + CONFIG.policyShift[policy], 0, 4));
}

/**
 * One punishment: the fairness model and the punishment record.
 * Fairness rises when punishment fits the offence, falls hard when it exceeds
 * it and a little when it falls well short (the men see favourites).
 */
export function punish(s, gravity, severity, who = null) {
  const sev = Math.round(clamp(severity, 0, 4));
  const diff = sev - gravity;
  const d = s.crew.drivers;
  let df = 0;
  if (Math.abs(diff) <= 0.75) df = CONFIG.fairnessPerJust;
  else if (diff > 0.75) df = -CONFIG.fairnessPerExcess * (diff - 0.5);
  else if (diff < -1) df = -CONFIG.fairnessPerSoft * (-diff - 1);
  d.fairness = clamp(d.fairness + df);
  s.crew.discipline = clamp(s.crew.discipline + CONFIG.disciplinePerSeverity * sev - 0.4);
  if (diff > 1.25) s.crew.grievance = clamp(s.crew.grievance + 1.2 * (diff - 1));
  const r = s.record;
  r.punishments++;
  if (sev === 3) { r.floggings++; r.lashes += CONFIG.lashesRegulation; }
  if (sev === 4) { r.floggings++; r.lashes += CONFIG.lashesHarsh; r.overRegulation++; }
  if (who) {
    const m = s.named.find((n) => n.id === who);
    if (m) m.stance = clamp(m.stance - (sev >= 3 ? 12 : 4) + (Math.abs(diff) <= 0.75 ? 6 : 0), -100, 100);
  }
  return { severity: sev, fairness: df };
}

// ---- applying ops -----------------------------------------------------------

export function apply(s, ops, rng, ctx = {}) {
  const out = { battle: null, chase: null, mutiny: null };
  for (const op of ops || []) {
    const [k, a, b, c] = op;
    switch (k) {
      case 'driver': s.crew.drivers[a] = clamp(s.crew.drivers[a] + b); break;
      case 'discipline': s.crew.discipline = clamp(s.crew.discipline + a); break;
      case 'grievance': s.crew.grievance = clamp(s.crew.grievance + a); break;
      case 'rep': s.player.rep[a] = clamp(s.player.rep[a] + b); break;
      case 'interest': s.player.interest = clamp(s.player.interest + a); break;
      case 'money': money(s, a, b || 'Expenses'); break;
      case 'skill': s.crew.skill[a] = clamp(s.crew.skill[a] + b, 0, CONFIG.skillCap); break;
      case 'health': s.crew.health = clamp(s.crew.health + a); break;
      case 'hull': s.ship.hull = clamp(s.ship.hull + a); break;
      case 'rigging': s.ship.rigging = clamp(s.ship.rigging + a); break;
      case 'store': s.ship.stores[a] = Math.max(0, s.ship.stores[a] + b); break;
      case 'men': {
        const g = s.crew.groups;
        const before = g[a];
        g[a] = Math.max(0, g[a] + b);
        if (b < 0 && c) s.record[c] += before - g[a];
        break;
      }
      case 'stance': {
        const m = s.named.find((n) => n.id === a);
        if (m) m.stance = clamp(m.stance + b, -100, 100);
        break;
      }
      case 'named': { // set a named man's status: dead, deserted, hanged, rated, ashore
        const m = s.named.find((n) => n.id === a);
        if (m && m.status === 'aboard') m.status = b;
        break;
      }
      case 'loyalty': {
        const o = officer(s, a);
        if (o) o.loyalty = clamp(o.loyalty + b);
        break;
      }
      case 'curb': {
        const o = officer(s, a);
        if (o) o.curbed = true;
        break;
      }
      case 'punish': punish(s, a, b, c); break;
      case 'flag': s.flags[a] = b === undefined ? true : b; break;
      case 'log': log(s, a, b || 'note'); break;
      case 'depart': s.record.departures++; s.commission.departed = true; break;
      case 'battle': out.battle = a; break;
      case 'chase': out.chase = a; break;
      case 'mutiny': out.mutiny = a; break;
      case 'stage': s.crew.grievance = clamp(s.crew.grievance + a * 20); break;
      case 'weeks': s.commission.weeks = Math.max(s.commission.week + 1, s.commission.weeks + a); break;
      case 'convoyLoss': s.commission.convoyLost++; s.record.convoyLost++; break;
      default: throw new Error(`unknown effect op ${k}`);
    }
  }
  return out;
}

/** Value a check is made against: an effective skill or a driver. */
export function checkValue(s, skill) {
  if (skill === 'seamanship' || skill === 'gunnery') return effective(s)[skill];
  if (skill === 'morale') return morale(s);
  if (skill === 'discipline') return s.crew.discipline;
  if (skill === 'interest') return s.player.interest;
  if (skill in s.crew.drivers) return s.crew.drivers[skill];
  throw new Error(`unknown check skill ${skill}`);
}

export function optionChance(s, opt) {
  if (!opt.check) return null;
  return checkChance(checkValue(s, opt.check.skill), opt.check.vs);
}

// ---- describing ops ---------------------------------------------------------

const NAMES = {
  fairness: 'Fairness', trust: 'Trust', provisions: 'Provisions', workload: 'Rest', prospects: 'Prospects',
  service: 'Service reputation', public: 'Public name', men: 'Name among the men',
  gunnery: 'Gunnery', seamanship: 'Seamanship', food: 'Food', powder: 'Powder', water: 'Water',
};

function size(x, big = 6) {
  const a = Math.abs(x);
  const dir = x > 0 ? 'up' : 'down';
  return a >= big ? `${dir} sharply` : dir;
}

export function describe(s, ops) {
  const parts = [];
  for (const op of ops || []) {
    const [k, a, b, c] = op;
    switch (k) {
      case 'driver': parts.push(`${NAMES[a]} ${size(b)}`); break;
      case 'discipline': parts.push(`Discipline ${size(a)}`); break;
      case 'grievance': parts.push(a > 0 ? 'Grievance grows' : 'Grievance eases'); break;
      case 'rep': parts.push(`${NAMES[a]} ${size(b)}`); break;
      case 'interest': parts.push(`Interest ${size(a)}`); break;
      case 'money': parts.push(`${a < 0 ? 'Costs' : 'Gains'} £${Math.abs(a)}`); break;
      case 'skill': parts.push(`${NAMES[a]} ${size(b)}`); break;
      case 'health': parts.push(`Health ${size(a)}`); break;
      case 'hull': parts.push(`Hull ${size(a, 10)}`); break;
      case 'rigging': parts.push(`Rigging ${size(a, 10)}`); break;
      case 'store': parts.push(`${NAMES[a]} ${b < 0 ? `-${-b}` : `+${b}`}`); break;
      case 'men': parts.push(`${b > 0 ? '+' : ''}${b} ${a}`); break;
      case 'stance': {
        const m = s.named.find((n) => n.id === a);
        if (m) parts.push(`${m.name.split(' ').slice(-1)[0]} ${b > 0 ? 'warmer' : 'colder'}`);
        break;
      }
      case 'named': {
        const m = s.named.find((n) => n.id === a);
        if (m) parts.push(`${m.name.replace(/^Mr /, '')} ${b === 'dead' ? 'dies' : b === 'hanged' ? 'hanged' : b === 'rated' ? 'rated up' : 'leaves the ship'}`);
        break;
      }
      case 'loyalty': {
        const o = officer(s, a);
        if (o) parts.push(`${o.label} ${b > 0 ? 'more loyal' : 'less loyal'}`);
        break;
      }
      case 'curb': parts.push('Officer curbed'); break;
      case 'punish': parts.push(`${SEVERITY[Math.round(clamp(b, 0, 4))]}${b - a > 0.75 ? ' (harsher than the offence)' : a - b > 1 ? ' (lighter than the offence)' : ''}`); break;
      case 'depart': parts.push('Departs from orders'); break;
      case 'battle': parts.push('Action'); break;
      case 'chase': parts.push('Chase'); break;
      case 'mutiny': parts.push('Mutiny'); break;
      case 'stage': parts.push(a > 0 ? 'Unrest grows' : 'Unrest eases'); break;
      case 'weeks': parts.push(`${a > 0 ? '+' : ''}${a} week${Math.abs(a) === 1 ? '' : 's'} on this commission`); break;
      case 'convoyLoss': parts.push('A merchantman lost'); break;
      default: break;
    }
  }
  return parts.join(' · ');
}

export function stakeLine(s, opt) {
  if (opt.check) {
    const p = optionChance(s, opt);
    const pass = describe(s, opt.check.pass);
    const fail = describe(s, opt.check.fail);
    return `${opt.check.label || opt.check.skill}: ${band(p)}. If it goes well: ${pass || 'no change'}. If not: ${fail || 'no change'}.`;
  }
  const d = describe(s, opt.ops);
  return d || 'No change';
}
