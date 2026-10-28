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
import { formatDay, monthYear } from './calendar.js';
import { log } from './state.js';

export const ORDER_CHOICES = {
  drill: { label: 'Drill', values: { none: 'None', seamanship: 'Seamanship', gunnery: 'Great guns', mixed: 'Both' } },
  rations: { label: 'Rations', values: { full: 'Full', short: 'Short (six upon four)' } },
  work: { label: 'Work', values: { light: 'Light', normal: 'Normal', hard: 'Hard' } },
  discipline: { label: 'Punishment', values: { lenient: 'Lenient', firm: 'Firm', harsh: 'Harsh' } },
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
    orderEffects: orderEffects(s),
    commission: c && {
      label: ORDER_TYPES[c.orders].label, brief: ORDER_TYPES[c.orders].brief, station: STATIONS[c.station],
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

/** What a named man says, from his stance and the ship's worst driver (risk: morale as a hidden number). */
function voice(s, m) {
  const worst = Object.entries(s.crew.drivers).sort((a, b) => a[1] - b[1])[0];
  const topic = { fairness: 'the punishments', trust: 'the quarterdeck', provisions: 'the beef', workload: 'the work', prospects: 'a dead ship with no prizes' }[worst[0]];
  if (m.stance >= 25) return worst[1] < 40 ? `"The lads are sore about ${topic}, sir. I'd not say it if I didn't mean well."` : '"A good ship, this. The men know it."';
  if (m.stance <= -25) return worst[1] < 40 ? `Says loudly on the lower deck that ${topic} is past bearing.` : 'Keeps his own counsel, and the men listen to it.';
  return worst[1] < 40 ? `Grumbles about ${topic}.` : 'Does his duty and says little.';
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

/** What each standing order does per week, from CONFIG (the same numbers week.js uses). */
function orderEffects(s) {
  const dr = CONFIG.drill[s.orders.drill];
  const w = CONFIG.work[s.orders.work];
  const r = CONFIG.rations[s.orders.rations];
  const sign = (x) => (x > 0 ? `+${x}` : `${x}`);
  return [
    `Drill: gunnery ${sign(dr.gunnery)}, seamanship ${sign(dr.seamanship)} a week before diminishing returns; ${dr.powder === 1 ? 'one barrel' : `${dr.powder} barrels`} of powder a week.`,
    `Rest ${sign(dr.workload + w.workload)} a week; ship wear x${w.wear}; seamanship counted at x${w.seamanshipMult}.`,
    `Rations: ${r.food === 1 ? 'one week' : `${r.food} of a week`} of food a week; provisions ${sign(r.provisions)}.`,
    `Punishment: each offence punished ${s.orders.discipline === 'firm' ? 'to fit it' : s.orders.discipline === 'harsh' ? 'harder than it deserves' : 'lighter than it deserves'}. ${s.orders.discipline === 'harsh' ? `Floggings go beyond the regulation dozen.` : ''}`,
  ];
}
