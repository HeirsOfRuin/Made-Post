// One week at sea, in written order (architecture invariant 7). Each phase
// reads the standing orders and the state, and the week ends with at most one
// decision for the captain.
//
//   1 orders     drill, rations, work: skills, stores, wear, workload
//   2 officers   faults act on their own
//   3 health     scurvy, fever, deaths
//   4 offences   generated from discipline and morale; punished by policy
//   5 drivers    drift, prospects from the orders
//   6 discipline drift toward the officers' level
//   7 grievance  mutiny ladder
//   8 crew       pressed men won over, landsmen trained, desertion
//   9 event      one decision: scripted, ladder, sighting or system
//  10 clock      day += 7, history

import { CONFIG } from '../data/config.data.js';
import { ORDER_TYPES } from '../data/orders.data.js';
import { SHIP_TRAITS } from '../data/ships.data.js';
import { HISTORY } from '../data/acts.data.js';
import { EVENTS, SYSTEM_EVENTS, TUTORIAL_WEEKS } from '../content/events.js';
import { streamFor } from './rng.js';
import { clamp, morale, baseSkill, crewTotal, manning, pressedShare, lemonJuice, mutinyStage, ANARCHY } from './derive.js';
import { OFFENCES, policySeverity, punish } from './effects.js';
import { dayOf } from './calendar.js';
import { log, officer, money } from './state.js';
import { removeMen } from './battle.js';

export function seaWeek(s) {
  const rng = (label) => streamFor(s.seed, s.turn, label);
  const c = s.commission;
  const orders = s.orders;
  const d = s.crew.drivers;
  const traits = SHIP_TRAITS[s.ship.trait] || {};

  // 1 orders --------------------------------------------------------------------
  const drill = CONFIG.drill[orders.drill];
  let powderUse = drill.powder;
  let gunGain = drill.gunnery;
  if (powderUse > s.ship.stores.powder) {
    // Out of powder: practice runs out, unless the captain buys more in port.
    gunGain *= s.ship.stores.powder / powderUse;
    powderUse = s.ship.stores.powder;
  }
  s.ship.stores.powder -= powderUse;
  const base = baseSkill(s);
  const capt = 1 + (s.player.skills.gunnery - 50) / 200;
  for (const [k, gain] of [['gunnery', gunGain * capt], ['seamanship', drill.seamanship]]) {
    const cur = s.crew.skill[k];
    if (gain > 0) s.crew.skill[k] = Math.min(CONFIG.skillCap, cur + gain * (1 - cur / (CONFIG.skillCap + 5)));
    else if (cur > base[k]) s.crew.skill[k] = Math.max(base[k], cur - CONFIG.skillDecay);
    else s.crew.skill[k] = Math.min(base[k], cur + 1);
    s.crew.skill[k] = Math.round(s.crew.skill[k] * 10) / 10;
  }
  // Sea time itself teaches seamanship a little.
  s.crew.skill.seamanship = Math.min(CONFIG.skillCap, s.crew.skill.seamanship + 0.4);
  const work = CONFIG.work[orders.work];
  d.workload = clamp(d.workload + drill.workload + work.workload);
  // A crank ship labours whatever the orders, and worse when driven hard.
  const strain = traits.strain ? (orders.work === 'hard' ? traits.strain : 1 + (traits.strain - 1) / 2) : 1;
  const wear = CONFIG.wearPerWeek * work.wear * strain;
  s.ship.hull = clamp(s.ship.hull - wear * 0.6);
  s.ship.rigging = clamp(s.ship.rigging - wear);
  const rations = CONFIG.rations[orders.rations];
  s.ship.stores.food = Math.max(0, s.ship.stores.food - rations.food);
  s.ship.stores.water = Math.max(0, s.ship.stores.water - (c.orders === 'blockade' ? 0.6 : 0.8));
  d.provisions = clamp(d.provisions + rations.provisions - (s.crew.weeksSinceFresh > 6 ? 1 : 0));
  if (s.ship.stores.food <= 0 || s.ship.stores.water <= 0) {
    d.provisions = clamp(d.provisions - 8);
    s.crew.health = clamp(s.crew.health - 4);
  }

  // 2 officers ------------------------------------------------------------------
  const or = rng('officers');
  for (const o of s.officers) {
    if (o.status !== 'aboard') continue;
    if (o.fault === 'cruel' && !o.curbed) {
      d.fairness = clamp(d.fairness - 1.4);
      s.record.startings += or.range(2, 6);
    }
    if (o.fault === 'slack' && !o.curbed) s.crew.discipline = clamp(s.crew.discipline - 0.8);
    if (o.fault === 'drink' && !o.curbed && or.chance(0.06)) {
      s.ship.rigging = clamp(s.ship.rigging - 10);
      log(s, `${o.name} was drunk in the middle watch; the fore-topmast went over the side.`, 'officer');
    }
  }

  // 3 health --------------------------------------------------------------------
  const hr = rng('health');
  s.crew.weeksSinceFresh++;
  if (s.flags.freshFood) { s.crew.weeksSinceFresh = 0; s.flags.freshFood = false; }
  let dh = 1.2;
  if (s.crew.weeksSinceFresh > CONFIG.scurvyWeeks && !lemonJuice(s)) dh -= 1.5 + 0.4 * (s.crew.weeksSinceFresh - CONFIG.scurvyWeeks);
  if (s.crew.discipline < 35 && manning(s) > 0.9 && hr.chance(0.15)) { dh -= 6; log(s, 'Ship fever (typhus) below decks: a dirty, crowded ship.', 'health'); }
  if (traits.health) dh += traits.health;
  if (d.workload < 25) dh -= 1;
  s.crew.health = clamp(s.crew.health + dh, 0, traits.healthCap || 96);
  const surgeon = officer(s, 'surgeon');
  const sick = Math.round(crewTotal(s) * (100 - s.crew.health) / 300);
  const mortality = CONFIG.sickMortality * (surgeon ? 1.4 - surgeon.competence / 100 : 1.5);
  const deaths = Math.min(sick, Math.round(sick * mortality * hr.float(0.5, 1.5) + (hr.chance((sick * mortality) % 1) ? 1 : 0)));
  if (deaths > 0) { removeMen(s, deaths); s.record.died += deaths; }
  s.crew.sick = sick;

  // 4 offences ------------------------------------------------------------------
  const pr = rng('offences');
  const m0 = morale(s);
  const lambda = CONFIG.offenceBase * crewTotal(s) / 100
    * (1 + (50 - s.crew.discipline) / 50)
    * (1 + (50 - m0) / 80)
    * (1 + pressedShare(s) * 1.5);
  const offences = poisson(pr, Math.max(0, lambda));
  for (let i = 0; i < offences; i++) {
    const o = pr.weighted(OFFENCES);
    s.crew.discipline = clamp(s.crew.discipline - 0.6);
    punish(s, o.gravity, policySeverity(orders.discipline, o.gravity));
  }
  s.weekOffences = offences;

  // 5 drivers -------------------------------------------------------------------
  const ot = ORDER_TYPES[c.orders];
  d.prospects = clamp(d.prospects + ot.prospects + (traits.prospects || 0));
  if (traits.trustDrift) d.trust = clamp(d.trust + traits.trustDrift);
  for (const k of Object.keys(d)) d[k] = clamp(d[k] + (50 - d[k]) * CONFIG.driverDrift);
  // Named men move with the ship, each by what he cares about most.
  for (const n of s.named) {
    if (n.status !== 'aboard') continue;
    const care = n.role === 'sea lawyer' ? d.fairness : n.role === 'ringleader' ? (d.fairness + d.provisions) / 2 - 12 : n.role === 'gunner' ? 50 + (s.ship.stores.powder > 20 ? 5 : -10) + (orders.drill === 'gunnery' ? -6 : 0) : (d.trust + d.fairness) / 2;
    n.stance = clamp(n.stance + ((care - 50) - n.stance) * 0.06, -100, 100);
  }
  // The men's view of their captain follows fairness and trust, slowly.
  s.player.rep.men = clamp(s.player.rep.men + ((d.fairness + d.trust) / 2 - s.player.rep.men) * 0.05);

  // 6 discipline ------------------------------------------------------------------
  const first = officer(s, 'first');
  const target = 35 + (first ? first.competence * 0.3 : 10) + (orders.discipline === 'lenient' ? -12 : orders.discipline === 'harsh' ? 8 : 0);
  const step = CONFIG.disciplineDrift;
  s.crew.discipline = clamp(s.crew.discipline + Math.sign(target - s.crew.discipline) * Math.min(step, Math.abs(target - s.crew.discipline)));

  // 7 grievance -----------------------------------------------------------------
  const m = morale(s);
  let dg = m < CONFIG.moraleLine ? (CONFIG.moraleLine - m) * CONFIG.grievanceFromMorale : -CONFIG.grievanceDecay;
  if (d.fairness < 30) dg += 1;
  const ring = s.named.find((n) => n.id === 'ringleader' && n.status === 'aboard');
  if (ring && dg > 0) dg *= 1 + Math.max(0, -ring.stance) / 100;
  dg += pressedShare(s) * (dg > 0 ? 2 : 0);
  s.crew.grievance = clamp(s.crew.grievance + dg);
  const stage = mutinyStage(s.crew.grievance);
  const rose = stage > s.crew.stage;
  s.crew.stage = stage;

  // 8 crew ------------------------------------------------------------------------
  const cr = rng('crew');
  const g = s.crew.groups;
  if (d.fairness > 55 && d.trust > 50 && g.pressed > 0) {
    const won = binom(cr, g.pressed, 0.04);
    g.pressed -= won; g.ordinary += won;
  }
  if (orders.drill === 'seamanship' || orders.drill === 'mixed') {
    const t = binom(cr, g.landsmen, orders.drill === 'seamanship' ? 0.05 : 0.025);
    g.landsmen -= t; g.ordinary += t;
  }
  const up = binom(cr, g.ordinary, 0.01);
  g.ordinary -= up; g.able += up;
  if (c.orders !== 'cruise' && m < 35) {
    const ran = binom(cr, g.pressed, 0.02) + binom(cr, g.able, 0.005);
    if (ran) { removeMen(s, ran); s.record.deserted += ran; log(s, `${ran} men ran when the boats went inshore.`, 'crew'); }
  }
  // The anarchy failure (brief rule 2): a slack ship has accidents. Men fall
  // from aloft, boats are lost, she misses stays and touches ground.
  if (s.crew.discipline < ANARCHY) {
    c.slackWeeks = (c.slackWeeks || 0) + 1;
    const ar = rng('anarchy');
    if (ar.chance(0.18 + (ANARCHY - s.crew.discipline) / 100)) {
      const hurt = ar.range(1, 4);
      removeMen(s, hurt);
      s.record.died += hurt;
      s.ship.hull = clamp(s.ship.hull - ar.range(4, 14));
      s.ship.rigging = clamp(s.ship.rigging - ar.range(4, 12));
      log(s, `A slack ship: ${hurt} men lost in an accident that a sober, attentive watch would have prevented.`, 'crew');
    }
  }
  s.record.weeksAtSea++;
  s.record.crewWeeks += crewTotal(s);
  s.record.meanCrew = Math.round(s.record.crewWeeks / s.record.weeksAtSea);

  // pay and the captain's table
  money(s, CONFIG.payPerWeek[s.player.rank] - CONFIG.tablePerWeek, 'Pay less the captain\'s table');

  // 9 event -----------------------------------------------------------------------
  c.week++;
  s.pending = pickEvent(s, rose, rng('event'));

  // 10 clock ----------------------------------------------------------------------
  s.day += CONFIG.weekDays;
  s.turn++;
  fireHistory(s, true);
  if (s.ship.hull <= 0) s.wrecked = true;
}

function poisson(rng, lambda) {
  // Knuth; lambda is small (a few offences a week).
  const L = Math.exp(-lambda);
  let k = 0, p = 1;
  do { k++; p *= rng.next(); } while (p > L && k < 60);
  return k - 1;
}

function binom(rng, n, p) {
  let k = 0;
  for (let i = 0; i < n; i++) if (rng.next() < p) k++;
  return k;
}

/** The week's one decision, in priority order. */
export function pickEvent(s, ladderRose, rng) {
  const c = s.commission;
  const ctx = {};
  // finale on the last week
  if (c.week >= c.weeks && c.finale) return { id: c.finale, ctx };
  if (c.tutorial && TUTORIAL_WEEKS[c.week] && !s.flags[`tut:${c.week}`]) {
    s.flags[`tut:${c.week}`] = true;
    return { id: TUTORIAL_WEEKS[c.week], ctx };
  }
  const queued = s.queue.shift();
  if (queued) return queued;
  if (ladderRose && s.crew.stage >= 1) return { id: `mut-${s.crew.stage}`, ctx };
  if (c.week >= c.weeks) return null;
  const ot = ORDER_TYPES[c.orders];
  if (rng.chance(ot.sighting)) {
    const pool = Object.entries(c.enemies).map(([kind, weight]) => ({ kind, weight }));
    const e = rng.weighted(pool);
    if (e) return { id: 'sighting', ctx: { enemy: e.kind } };
  }
  if (!rng.chance(CONFIG.eventChance)) return null;
  const pool = SYSTEM_EVENTS.map((id) => ({ id, weight: EVENTS[id].weight(s) })).filter((x) => x.weight > 0);
  const pick = rng.weighted(pool);
  if (!pick) return null;
  const ev = EVENTS[pick.id];
  return { id: pick.id, ctx: ev.prepare ? ev.prepare(s, rng) : {} };
}

/** Fire every historical item whose date has passed. Tests queue a decision if at sea. */
export function fireHistory(s, atSea) {
  for (const h of HISTORY) {
    if (s.history[h.id] || s.day < dayOf(h.date)) continue;
    s.history[h.id] = true;
    log(s, h.text, 'history');
    if (h.flag) s.flags[h.flag] = true;
    if (h.kind === 'test' && atSea && s.commission && s.commission.station === 'brest') s.queue.push({ id: h.event, ctx: {} });
  }
}

export { ANARCHY };
