// The only place shown numbers are computed (rule 1: one derivation per number).
// The engine resolves with these functions and view.js shows them, so what the
// player reads is what happened.

import { CONFIG } from '../data/config.data.js';
import { GROUP_SKILL } from '../data/cast.data.js';
import { SHIP_CLASSES, SHIP_TRAITS } from '../data/ships.data.js';
import { dayOf } from './calendar.js';

export const clamp = (x, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, x));
export const round1 = (x) => Math.round(x * 10) / 10;

export function crewTotal(s) {
  const g = s.crew.groups;
  return g.able + g.ordinary + g.landsmen + g.pressed + g.marines;
}

export function seamenTotal(s) {
  const g = s.crew.groups;
  return g.able + g.ordinary + g.landsmen + g.pressed;
}

export function complement(s) {
  return SHIP_CLASSES[s.ship.cls].complement;
}

/** 0..1: how far the ship is manned. A short-handed ship fights and sails short. */
export function manning(s) {
  return clamp(crewTotal(s) / complement(s), 0, 1);
}

export function morale(s) {
  const w = CONFIG.driverWeights;
  const d = s.crew.drivers;
  let m = 0;
  for (const k of Object.keys(w)) m += w[k] * d[k];
  return round1(m);
}

/** Skill the crew's make-up gives with no drill: where skills decay toward. */
export function baseSkill(s) {
  const g = s.crew.groups;
  const n = seamenTotal(s) || 1;
  const sea = (g.able * GROUP_SKILL.able + g.ordinary * GROUP_SKILL.ordinary + g.landsmen * GROUP_SKILL.landsmen + g.pressed * GROUP_SKILL.pressed) / n;
  return { seamanship: round1(sea), gunnery: round1(sea * 0.75) };
}

export function pressedShare(s) {
  return s.crew.groups.pressed / (crewTotal(s) || 1);
}

/** Discipline below this and the ship starts to come apart (the anarchy failure). */
export const ANARCHY = 25;

/**
 * Effective seamanship and gunnery: the trained skill, scaled by the work order,
 * manning, discipline and (a little) the captain's own skill. Used by checks,
 * chases, gales and the battle resolver alike.
 */
export function effective(s) {
  const work = CONFIG.work[s.orders.work];
  const man = 0.55 + 0.45 * manning(s);
  const disc = s.crew.discipline < ANARCHY ? 0.6 + 0.016 * s.crew.discipline : 1;
  const health = 0.7 + 0.3 * (s.crew.health / 100);
  const sea = s.crew.skill.seamanship * work.seamanshipMult * man * disc * health + 0.15 * (s.player.skills.seamanship - 50);
  const gun = s.crew.skill.gunnery * man * disc * health + 0.1 * (s.player.skills.gunnery - 50);
  return { seamanship: round1(clamp(sea)), gunnery: round1(clamp(gun)) };
}

export function shipSpeed(s) {
  const c = SHIP_CLASSES[s.ship.cls];
  const t = SHIP_TRAITS[s.ship.trait] || {};
  return c.speed + (t.speed || 0) + (s.ship.rigging - 100) * 0.12;
}

/** Chance (0..1) of a skill check, and the band shown to the player. */
export function checkChance(skill, difficulty) {
  return clamp(0.5 + (skill - difficulty) / 60, 0.05, 0.95);
}
export function band(p) {
  if (p >= 0.8) return 'Likely';
  if (p >= 0.6) return 'Favourable';
  if (p >= 0.4) return 'Even';
  if (p >= 0.2) return 'Risky';
  return 'Long odds';
}

export function mutinyStage(grievance) {
  let st = 0;
  for (const t of CONFIG.mutinyStages) if (grievance >= t) st++;
  return st;
}

export const STAGE_LABELS = ['Quiet', 'Muttering', 'Petitions', 'Refusing duty', 'Open mutiny'];

/** The warning signs a captain could see, from state. Shown in the Crew tab. */
export function warningSigns(s) {
  const out = [];
  const m = morale(s);
  if (s.crew.stage >= 1) out.push('Men fall silent when officers pass.');
  if (s.crew.stage >= 2) out.push('A round robin is passing below decks.');
  if (s.crew.discipline < ANARCHY) out.push('Orders are obeyed slowly or not at all. Drunkenness on watch.');
  if (s.crew.drivers.fairness < 30) out.push('The men think punishment aboard is arbitrary.');
  if (s.crew.drivers.provisions < 30) out.push('Complaints about the food are open.');
  if (s.crew.drivers.workload < 30) out.push('The men are worn out.');
  if (s.crew.drivers.prospects < 30) out.push('Talk of a "dead ship": no prizes, no hope.');
  if (s.crew.drivers.trust < 30) out.push('The men do not trust their captain.');
  if (!out.length && m >= 60) out.push('A willing ship. The men sing at the capstan.');
  return out;
}

export function lemonJuice(s) {
  return s.day >= dayOf(CONFIG.lemonJuiceDay);
}

/** Captain's fraction of a prize, by date and whether an admiral shares. */
export function captainShare(s, flagShare) {
  const after = s.day >= dayOf(CONFIG.prizeReformDay);
  const r = after ? CONFIG.prizeShares.after1808 : CONFIG.prizeShares.before1808;
  return flagShare ? r.captain - r.flag : r.captain;
}

/**
 * The Admiralty's view of you when a ship is to be given: interest and service
 * reputation, minus your punishment record if the First Lord or your admiral
 * minds it. Shown on the Career tab with its parts.
 */
export function postingScore(s) {
  const parts = {
    interest: round1(s.player.interest * 0.55),
    service: round1(s.player.rep.service * 0.45),
    public: round1(s.player.rep.public * 0.15),
    record: round1(-4 * s.record.shipsLost - 3 * s.record.mutinies),
  };
  const total = round1(Object.values(parts).reduce((a, b) => a + b, 0));
  return { parts, total };
}

/** The punishment record as one reading: lashes per 100 men per year at sea. */
export function lashRate(s) {
  const years = Math.max(0.25, s.record.weeksAtSea / 52);
  return round1(s.record.lashes / years / Math.max(1, s.record.meanCrew / 100));
}

/** Where a captain stood between Collingwood and Pigot. */
export function conductLabel(s) {
  const r = lashRate(s);
  if (r < 40) return 'a Collingwood: sparing with the lash';
  if (r < 120) return 'a firm captain, within the custom of the service';
  if (r < 260) return 'a hard captain';
  return 'a flogging captain, of Pigot\'s kind';
}
