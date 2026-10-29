// The facade (architecture invariant 1): newGame(), choose(state, input) and
// view(state). The UI, the bot and the tests use nothing else. choose() never
// mutates its argument.
//
// Inputs:
//   { type: 'orders', key, value }       standing orders, any time at sea or in port
//   { type: 'port', id }                 a port action, including 'sail'
//   { type: 'advance' }                  one week at sea
//   { type: 'option', id }               answer the pending decision
//   { type: 'battle', id }               a battle decision
//   { type: 'report' }                   leave the report screen
//   { type: 'interlude', id }            act break choice

import { CONFIG } from '../data/config.data.js';
import { ACTS, SUPERIORS } from '../data/acts.data.js';
import { ORDER_TYPES, STATIONS } from '../data/orders.data.js';
import { SHIP_CLASSES, SHIP_TRAITS } from '../data/ships.data.js';
import { GROUPS, FAULTS } from '../data/cast.data.js';
import { EVENTS } from '../content/events.js';
import { streamFor } from './rng.js';
import { newGame as fresh } from './state.js';
import * as D from './derive.js';
import { apply, stakeLine, optionChance } from './effects.js';
import { seaWeek } from './week.js';
import { startBattle, battleChoose, battleOptions, closeBattle } from './battle.js';
import { portActions, portChoose } from './port.js';
import { startCommission, endCommission, afterReport, interludeOptions, interludeChoose, interludeText, mutinyOutcome, courtMartial, finish, offeredClass, promotionScore, promotionThreshold } from './career.js';
import { score, obituary, rankTitle, ENDINGS } from './ending.js';
import { setupChoose, setupView } from './setup.js';
import { formatDay, monthYear } from './calendar.js';
import { GLOSSARY } from '../data/glossary.data.js';
import { log } from './state.js';

export const ORDER_CHOICES = {
  discipline: { label: 'Punishment', values: { lenient: 'Light', firm: 'Firm', harsh: 'Harsh' } },
  drill: { label: 'Training', values: { none: 'None', seamanship: 'Sailing', gunnery: 'Guns', mixed: 'Both' } },
  work: { label: 'Work', values: { light: 'Light', normal: 'Normal', hard: 'Hard' } },
  rations: { label: 'Food', values: { full: 'Full', short: 'Short' } },
};

// One plain sentence per setting, shown under the current choice. The numbers
// behind them are in CONFIG; the same values drive week.js.
export const ORDER_HINTS = {
  discipline: {
    lenient: 'Punishments lighter than the offence. The men like it, but discipline slips.',
    firm: 'Punishment that fits the offence. The men think it fair.',
    harsh: 'Punishments heavier than the offence, including floggings beyond the regulation 12 lashes. Order comes fast; the men think it unfair.',
  },
  drill: {
    none: 'No training. The men rest, and their skill slowly fades.',
    seamanship: 'Sail drill: the crew get better at handling the ship.',
    gunnery: `Live firing at the guns: gunnery improves fastest. Uses ${CONFIG.drill.gunnery.powder} barrels of powder a week.`,
    mixed: `Some of each. Both improve, more slowly. Uses ${CONFIG.drill.mixed.powder} barrel${CONFIG.drill.mixed.powder === 1 ? '' : 's'} of powder a week.`,
  },
  work: {
    light: 'An easy routine. The men rest, but the ship is less well kept and sails less sharply.',
    normal: 'The usual routine.',
    hard: 'Constant work. A smart, well-sailed ship, and tired men.',
  },
  rations: {
    full: 'Full rations.',
    short: 'Six men eat what four should: food lasts longer and the men hate it.',
  },
};

export function newGame(opts) {
  return fresh(opts);
}

export function choose(prev, input) {
  const s = structuredClone(prev);
  if (s.phase === 'ended') return s;
  switch (input.type) {
    case 'orders': {
      const spec = ORDER_CHOICES[input.key];
      if (!spec || !(input.value in spec.values)) throw new Error(`bad order ${input.key}=${input.value}`);
      s.orders[input.key] = input.value;
      return s;
    }
    case 'setup': {
      if (s.phase !== 'setup') throw new Error(`setup in phase ${s.phase}`);
      if (setupChoose(s, input.id)) { s.setup = null; startCommission(s); }
      return s;
    }
    case 'port': {
      if (s.phase !== 'port') throw new Error(`port action in phase ${s.phase}`);
      if (input.id === 'sail') {
        const a = portActions(s).find((x) => x.id === 'sail');
        if (a.locked) return s;
        startCommission(s);
        return s;
      }
      portChoose(s, input.id);
      return s;
    }
    case 'advance': {
      if (s.phase !== 'sea') throw new Error(`advance in phase ${s.phase}`);
      seaWeek(s);
      if (s.wrecked) {
        s.wrecked = false;
        log(s, 'She is driven ashore and goes to pieces.', 'disaster');
        s.ship.lost = true;
        s.record.shipsLost++;
        courtMartial(s, 'wreck', streamFor(s.seed, s.turn, 'cm'));
        return s;
      }
      if (s.pending) { s.phase = 'decision'; return s; }
      if (s.commission.week >= s.commission.weeks) endCommission(s);
      return s;
    }
    case 'option': {
      if (s.phase !== 'decision' || !s.pending) throw new Error(`option in phase ${s.phase}`);
      resolveOption(s, input.id);
      return s;
    }
    case 'battle': {
      if (s.phase !== 'battle' || !s.battle) throw new Error(`battle input in phase ${s.phase}`);
      const rng = streamFor(s.seed, s.turn, `battle:${s.battle.phase}:${s.battle.lines.length}`);
      if (s.battle.phase !== 'done') battleChoose(s, input.id, rng);
      if (s.battle.phase === 'done' && input.id === 'continue') afterBattle(s, rng);
      return s;
    }
    case 'report': {
      if (s.phase !== 'report') throw new Error(`report in phase ${s.phase}`);
      afterReport(s);
      return s;
    }
    case 'interlude': {
      if (s.phase !== 'interlude') throw new Error(`interlude in phase ${s.phase}`);
      interludeChoose(s, input.id);
      return s;
    }
    default:
      throw new Error(`unknown input ${input.type}`);
  }
}

function resolveOption(s, id) {
  const p = s.pending;
  const ev = EVENTS[p.id];
  const opts = ev.options(s, p.ctx);
  const opt = opts.find((o) => o.id === id);
  if (!opt) throw new Error(`no option ${id} on ${p.id}`);
  const rng = streamFor(s.seed, s.turn, `option:${p.id}`);
  let ops = opt.ops || [];
  let passed = null;
  if (opt.check) {
    passed = rng.chance(optionChance(s, opt));
    ops = passed ? opt.check.pass : opt.check.fail;
  }
  s.lastOutcome = { title: ev.title, choice: opt.label, passed, effects: stakeLine(s, { ops }) };
  log(s, `${ev.title}: ${opt.label}${passed === null ? '' : passed ? ' (it went well)' : ' (it went badly)'}.`, ev.kind);
  const out = apply(s, ops, rng, p.ctx);
  s.pending = null;
  s.phase = 'sea';
  if (out.mutiny === 'outbreak') {
    // The arrest failed: the ship rises.
    s.crew.grievance = Math.max(s.crew.grievance, 80);
    s.crew.stage = 4;
    s.pending = { id: 'mut-4', ctx: {} };
    s.phase = 'decision';
    return;
  }
  if (out.mutiny) {
    mutinyOutcome(s, out.mutiny, rng);
    if (s.phase === 'sea' && s.commission && s.commission.week >= s.commission.weeks) endCommission(s);
    return;
  }
  if (out.chase) {
    const caught = rng.chance(chaseChance(s, out.chase));
    if (!caught) {
      log(s, 'She out-sailed you and was hull-down by dark.', 'sighting');
      s.lastOutcome.effects += ' · She got away.';
      s.crew.drivers.prospects = D.clamp(s.crew.drivers.prospects - 2);
      if (s.commission.departed && s.commission.orders === 'convoy') apply(s, [['convoyLoss']], rng);
    } else {
      startBattle(s, out.chase, rng);
      return;
    }
  }
  if (out.battle) {
    startBattle(s, out.battle, rng);
    return;
  }
  if (ev.kind === 'finale') { endCommission(s); return; }
  if (s.commission && s.commission.week >= s.commission.weeks && !s.pending) endCommission(s);
}

export function chaseChance(s, kind) {
  const e = { merchant: 52, privateer: 66, french: 63, spanish: 57, american: 64 }[kind];
  const sea = D.effective(s).seamanship;
  return D.checkChance(sea + (D.shipSpeed(s) - e) * 2, 50);
}

function afterBattle(s, rng) {
  const result = closeBattle(s, rng);
  if (result === 'killed') { finish(s, 'killed'); return; }
  if (result === 'lost') {
    s.ship.lost = true;
    courtMartial(s, 'captured', rng);
    return;
  }
  s.phase = 'sea';
  if (s.commission && s.commission.finale && s.commission.week >= s.commission.weeks) {
    s.pending = { id: s.commission.finale, ctx: {} };
    s.phase = 'decision';
    return;
  }
  if (s.commission && s.commission.week >= s.commission.weeks) endCommission(s);
}

// ---- view: everything the UI shows ---------------------------------------------

export function view(s) {
  const c = s.commission;
  const act = ACTS[s.act];
  const eff = s.crew ? D.effective(s) : null;
  const v = {
    phase: s.phase,
    date: formatDay(s.day),
    month: monthYear(s.day),
    act: act ? { id: act.id, title: act.title, years: act.years } : null,
    captain: { name: s.player.name, rank: rankTitle(s), postList: s.player.postList, money: s.money, interest: Math.round(s.player.interest), rep: roundAll(s.player.rep), alive: s.player.alive },
    patron: s.patron,
    ship: s.ship && {
      name: s.ship.name, cls: SHIP_CLASSES[s.ship.cls].name, guns: SHIP_CLASSES[s.ship.cls].gunLabel,
      trait: s.ship.trait ? SHIP_TRAITS[s.ship.trait] : null,
      hull: Math.round(s.ship.hull), rigging: Math.round(s.ship.rigging),
      stores: { food: Math.round(s.ship.stores.food * 10) / 10, water: Math.round(s.ship.stores.water * 10) / 10, powder: Math.round(s.ship.stores.powder) },
      speed: Math.round(D.shipSpeed(s)),
    },
    crew: s.crew && {
      total: D.crewTotal(s), complement: D.complement(s),
      groups: Object.entries(s.crew.groups).map(([k, n]) => ({ id: k, label: GROUPS[k].label, note: GROUPS[k].note, n })),
      skill: { seamanship: Math.round(s.crew.skill.seamanship), gunnery: Math.round(s.crew.skill.gunnery) },
      effective: eff && { seamanship: Math.round(eff.seamanship), gunnery: Math.round(eff.gunnery) },
      health: Math.round(s.crew.health), sick: s.crew.sick || 0,
      morale: D.morale(s),
      drivers: roundAll(s.crew.drivers),
      discipline: Math.round(s.crew.discipline),
      grievance: Math.round(s.crew.grievance),
      stage: D.STAGE_LABELS[s.crew.stage],
      signs: D.warningSigns(s),
      offences: s.weekOffences || 0,
    },
    named: s.named.map((m) => ({ name: m.name, role: m.role, origin: m.origin, note: m.note, status: m.status, mood: m.stance >= 25 ? 'Loyal' : m.stance <= -25 ? 'Hostile' : 'Wary', says: s.crew && m.status === 'aboard' ? voice(s, m) : '' })),
    officers: s.officers.filter((o) => o.status === 'aboard').map((o) => ({ label: o.label, name: o.name, competence: o.competence, loyalty: Math.round(o.loyalty), fault: FAULTS[o.fault].label, faultNote: o.curbed ? 'Curbed by you.' : FAULTS[o.fault].note })),
    followers: s.followers,
    orders: { ...s.orders },
    orderChoices: ORDER_CHOICES,
    orderHints: Object.fromEntries(Object.keys(ORDER_HINTS).map((k) => [k, ORDER_HINTS[k][s.orders[k]]])),
    status: s.crew && s.ship ? D.statusLine(s) : '',
    glossary: GLOSSARY,
    commission: c && {
      label: ORDER_TYPES[c.orders].label, brief: ORDER_TYPES[c.orders].brief, station: STATIONS[c.station], story: currentNote(s),
      week: c.week, weeks: c.weeks, superior: SUPERIORS[c.superior].name, superiorNote: SUPERIORS[c.superior].note,
    },
    career: {
      posting: D.postingScore(s), offered: s.crew ? offeredClass(s) : null,
      promotion: s.player.rank === 'commander' ? { score: promotionScore(s), threshold: promotionThreshold(s) } : null,
      lashRate: D.lashRate(s), conduct: D.conductLabel(s),
    },
    record: { ...s.record },
    log: s.log.slice(-60).reverse().map((l) => ({ date: formatDay(l.day), text: l.text, kind: l.kind })),
    ledger: s.ledger.slice(-30).reverse().map((l) => ({ date: formatDay(l.day), amount: l.amount, reason: l.reason })),
    lastOutcome: s.lastOutcome || null,
    lastBattle: s.lastBattle || null,
    reports: s.reports.slice(-6).reverse(),
  };
  if (s.phase === 'setup') v.setup = setupView(s);
  if (s.phase === 'port') v.port = { name: s.port.name, actions: portActions(s), next: nextCommissionNote(s) };
  if (s.phase === 'sea') v.advance = { label: 'Next week', locked: null };
  if (s.phase === 'decision' && s.pending) {
    const ev = EVENTS[s.pending.id];
    v.decision = {
      id: s.pending.id, kind: ev.kind, title: ev.title, text: ev.text(s, s.pending.ctx),
      options: ev.options(s, s.pending.ctx).map((o) => ({ id: o.id, label: o.label, stake: stakeLine(s, o), tags: o.tags || [] })),
    };
  }
  if (s.phase === 'battle' && s.battle) {
    const b = s.battle;
    v.battle = {
      phase: b.phase, foe: `${b.foe.flag} ${b.foe.name}`, lines: b.lines,
      own: sideView(b.own), enemy: sideView(b.foe), gauge: b.gauge,
      options: battleOptions(s).map(({ id, label, stake, tags }) => ({ id, label, stake, tags: tags || [] })),
    };
  }
  if (s.phase === 'report') v.report = s.lastReport;
  if (s.phase === 'interlude') v.interlude = { text: interludeText(s), options: interludeOptions(s) };
  if (s.phase === 'ended') v.ending = { kind: s.ending.kind, title: ENDINGS[s.ending.kind], lines: s.ending.lines, score: score(s), obituary: obituary(s) };
  return v;
}

/**
 * What a named man says: his own concern, in his own manner, coloured by how he
 * feels about you. Each reads the driver his role cares about, so the men
 * disagree with each other the way a real crew would.
 */
function voice(s, m) {
  const d = s.crew.drivers;
  const warm = m.stance >= 25, cold = m.stance <= -25;
  const low = (k) => d[k] < 40;
  switch (m.role) {
    case 'boatswain':
      if (s.crew.discipline < 35) return '"The people are getting above themselves, sir. A slack ship is a dangerous ship."';
      return low('workload') ? '"They\'re tired, sir. Tired men drop things from aloft."' : '"Ship\'s in good order, sir."';
    case 'gunner':
      if (s.ship.stores.powder < 15) return '"We\'re near out of powder for practice, sir."';
      return s.orders.drill === 'gunnery' ? (warm ? '"They\'re coming on handsomely at the guns, sir."' : 'Mutters about powder burned on practice.') : '"The guns crews are rusty, sir. A bit of firing would do them good."';
    case 'ringleader':
      if (cold) return low('fairness') || low('provisions') ? 'Says openly that men are flogged for nothing here and fed on rot.' : 'Watches you, and says little. The men listen when he does speak.';
      return warm ? 'Works hard, and keeps the other pressed men in line.' : 'Does his work and keeps his opinions to himself, for now.';
    case 'sea lawyer':
      if (low('fairness')) return 'Is keeping a list of every punishment, and says he will send it to the Admiralty.';
      return low('provisions') ? 'Complains, citing the regulations, that the food is short weight.' : (warm ? 'Admits the ship is run by the book.' : 'Finds something to complain about, as always.');
    case 'promising landsman':
      return s.crew.skill.seamanship > 55 ? '"I can hand, reef and steer now, sir."' : 'Still learning the ropes, and learning fast.';
    case 'captain of the foretop':
      if (low('prospects')) return '"The lads want a prize, sir. Any prize."';
      return warm ? '"Best topmen in the squadron, sir."' : 'Proud of his topmen, and sharp with anyone who is slow.';
    default:
      return 'Does his duty and says little.';
  }
}

function sideView(x) {
  return { hull: Math.round(x.hull), crew: x.crewNow, crewStart: x.crewStart, broadside: x.broadside, gunnery: Math.round(x.gunnery), seamanship: Math.round(x.seamanship) };
}

function roundAll(o) {
  return Object.fromEntries(Object.entries(o).map(([k, v]) => [k, Math.round(v)]));
}

function nextCommissionNote(s) {
  const def = ACTS[s.act]?.commissions[s.com];
  if (!def) return null;
  return { orders: ORDER_TYPES[def.orders].label, station: STATIONS[def.station], note: def.note, weeks: def.weeks, superior: SUPERIORS[def.superior].name };
}

function currentNote(s) {
  const def = ACTS[s.act]?.commissions.find((c) => c.id === s.commission?.id);
  return def ? def.note : '';
}
