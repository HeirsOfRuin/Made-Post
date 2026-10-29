// New game, the money chokepoint, the log, and ship and crew assignment.

import { CONFIG } from '../data/config.data.js';
import { BACKGROUNDS, NAMED_MEN, TEACHER, SURNAMES, FORENAMES } from '../data/cast.data.js';
import { SHIP_CLASSES, SHIP_NAMES, SHIP_TRAITS } from '../data/ships.data.js';
import { ACTS } from '../data/acts.data.js';
import { dayOf } from './calendar.js';
import { streamFor } from './rng.js';
import { clamp, baseSkill, crewTotal } from './derive.js';

export const SAVE_VERSION = 1;

export function newGame({ seed = 1, background = 'naval', name = 'James Ashworth' } = {}) {
  const bg = BACKGROUNDS[background] || BACKGROUNDS.naval;
  const rng = streamFor(seed, 0, 'new');
  const first = ACTS[0].commissions[0];
  const s = {
    v: SAVE_VERSION,
    seed: seed >>> 0,
    turn: 0,
    day: dayOf(first.start) - 21,
    phase: 'setup',
    setup: { step: 0, choices: {} },
    player: {
      name, background, rank: 'commander', postDay: null, postList: null, alive: true,
      skills: { seamanship: bg.seamanship, gunnery: bg.gunnery },
      rep: { service: 30, public: 10, men: 30 + bg.trustBonus },
      interest: bg.interest,
    },
    patron: { name: bg.patron, standing: 60 },
    money: 0,
    ledger: [],
    act: 0,
    com: 0,
    commission: null,
    ship: null,
    crew: null,
    named: NAMED_MEN.map((m) => ({ ...m, stance: m.role === 'ringleader' ? -25 : m.role === 'sea lawyer' ? -10 : 10, status: 'aboard' })),
    officers: [],
    followers: [],
    orders: { drill: 'mixed', rations: 'full', work: 'normal', discipline: 'firm' },
    pending: null,
    battle: null,
    queue: [],
    history: {},
    flags: {},
    port: null,
    prizesPending: [],
    record: {
      actions: 0, won: 0, lost: 0, fled: 0, prizes: 0, prizeValue: 0, shipsTaken: 0, shipsLost: 0,
      lashes: 0, floggings: 0, startings: 0, punishments: 0, overRegulation: 0,
      killed: 0, died: 0, deserted: 0, promoted: 0, mutinies: 0, departures: 0, courtsMartial: 0,
      weeksAtSea: 0, meanCrew: 0, crewWeeks: 0, convoyLost: 0, fallbacks: 0,
    },
    reports: [],
    log: [],
    ending: null,
    counter: 1,
  };
  money(s, bg.money, 'Private means on taking command');
  assignShip(s, 'sloop', rng, { fresh: true });
  // Warrant officers, a few seamen and the marines: the rest is found in the
  // opening (setup.js), one choice at a time.
  const g = s.crew.groups;
  g.able = 14; g.ordinary = 10; g.landsmen = 0; g.pressed = 0; g.marines = 14;
  s.crew.skill = { ...baseSkill(s) };
  s.officers = makeOfficers(s, rng, true);
  log(s, `Appointed to command HMS ${s.ship.name}, sloop, at Portsmouth.`, 'career');
  return s;
}

/** The one place money moves. Every change writes a ledger row (rule: purse == ledger). */
export function money(s, amount, reason) {
  const a = Math.round(amount);
  if (!a) return;
  s.money += a;
  s.ledger.push({ day: s.day, amount: a, reason });
}

export function log(s, text, kind = 'note') {
  s.log.push({ day: s.day, text, kind });
  if (s.log.length > 400) s.log.splice(0, s.log.length - 400);
}

export function nextId(s) {
  return s.counter++;
}

function personName(rng, title = 'Mr') {
  return `${title} ${rng.pick(FORENAMES)} ${rng.pick(SURNAMES)}`;
}

export function makeOfficers(s, rng, teacher = false) {
  const faults = ['none', 'none', 'none', 'cruel', 'drink', 'slack', 'debt'];
  const make = (post, label, lo, hi) => ({
    post, label, name: personName(rng),
    competence: rng.range(lo, hi), loyalty: rng.range(35, 65), ambition: rng.range(20, 80),
    fault: rng.pick(faults), curbed: false, status: 'aboard',
  });
  const out = [];
  out.push(teacher ? { ...TEACHER, label: 'First lieutenant', curbed: false, status: 'aboard' } : make('first', 'First lieutenant', 40, 80));
  out.push(make('master', 'Master', 45, 80));
  out.push({ ...make('surgeon', 'Surgeon', 35, 85), fault: rng.pick(['none', 'none', 'drink']) });
  out.push({ ...make('mid1', 'Midshipman', 20, 70), name: personName(rng, 'Mr'), fault: 'none' });
  out.push({ ...make('mid2', 'Midshipman', 20, 70), name: personName(rng, 'Mr'), fault: 'none' });
  return out;
}

export function officer(s, post) {
  return s.officers.find((o) => o.post === post && o.status === 'aboard');
}

/**
 * Give the captain a ship. A new hull means a new ship's company: the men who
 * follow their captain (more if his name among the men is good) come with him,
 * the rest are found in port.
 */
export function assignShip(s, cls, rng, { fresh = false } = {}) {
  const c = SHIP_CLASSES[cls];
  const traits = Object.keys(SHIP_TRAITS);
  const trait = rng.chance(0.6) ? rng.pick(traits) : null;
  const name = rng.pick(SHIP_NAMES[cls]);
  const prev = s.crew;
  s.ship = {
    cls, name, trait, hull: 100, rigging: 100,
    stores: { ...c.stores },
  };
  const drivers = prev ? { ...prev.drivers } : { ...CONFIG.driverStart };
  drivers.trust = clamp((prev ? drivers.trust : CONFIG.driverStart.trust) + (trait === 'illfame' ? SHIP_TRAITS.illfame.trust : 0) + (fresh ? (s.player.rep.men - 30) * 0.3 : 0));
  s.crew = {
    groups: { able: 0, ordinary: 0, landsmen: 0, pressed: 0, marines: 0 },
    skill: { seamanship: 40, gunnery: 30 },
    health: prev ? prev.health : 90,
    drivers,
    discipline: prev ? prev.discipline : 50,
    grievance: prev ? Math.max(0, prev.grievance - 10) : 0,
    stage: 0,
    weeksSinceFresh: 0,
  };
  if (prev && !fresh) {
    // Followers: a share of the old company volunteers to follow you.
    const share = clamp(0.25 + s.player.rep.men / 200, 0.2, 0.7);
    const pg = prev.groups;
    const g = s.crew.groups;
    g.able = Math.round(pg.able * share);
    g.ordinary = Math.round(pg.ordinary * share);
    g.landsmen = Math.round(pg.landsmen * share * 0.5);
    g.pressed = 0;
    g.marines = Math.round(c.complement * 0.12);
    const kept = { seamanship: prev.skill.seamanship, gunnery: prev.skill.gunnery };
    const base = baseSkill(s);
    // Trained skill carries in proportion to the men who came with you.
    const carried = crewTotal(s) / c.complement;
    s.crew.skill = {
      seamanship: Math.round(base.seamanship + (kept.seamanship - base.seamanship) * carried),
      gunnery: Math.round(base.gunnery + (kept.gunnery - base.gunnery) * carried),
    };
  }
}

export function openPort(s, portName) {
  s.phase = 'port';
  s.port = { name: portName, done: {} };
  // A dockyard refit and fresh provisions on every return.
  if (s.ship) {
    s.ship.hull = 100;
    s.ship.rigging = 100;
    const c = SHIP_CLASSES[s.ship.cls];
    s.ship.stores.food = c.stores.food;
    s.ship.stores.water = c.stores.water;
    s.ship.stores.powder = Math.max(s.ship.stores.powder, c.stores.powder);
  }
  if (s.crew) {
    s.crew.weeksSinceFresh = 0;
    s.crew.health = clamp(s.crew.health + 15);
  }
}
