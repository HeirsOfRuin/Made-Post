// Engagements (brief section 6.7): three or four decisions, resolved by what was
// built before the fight. One resolver: hand play, the bot and the duel
// harness (sim/duel.js) all call exchange() through the same phase functions.

import { CONFIG } from '../data/config.data.js';
import { ENEMIES, SHIP_CLASSES } from '../data/ships.data.js';
import { ORDER_TYPES } from '../data/orders.data.js';
import { clamp, effective, morale, checkChance, band, crewTotal, shipSpeed, captainShare } from './derive.js';
import { log, officer } from './state.js';

const B = () => CONFIG.battle;

/** Build the two sides. The enemy's numbers are drawn once and kept in state. */
export function startBattle(s, kind, rng) {
  const e = ENEMIES[kind];
  const eff = effective(s);
  const c = SHIP_CLASSES[s.ship.cls];
  const jitter = () => rng.range(-8, 8);
  s.battle = {
    kind,
    phase: e.fights ? 'approach' : 'aftermath',
    gauge: null,
    surprise: false,
    own: {
      broadside: c.broadside, tons: c.tons, crewStart: crewTotal(s), crewNow: crewTotal(s),
      gunnery: eff.gunnery, seamanship: eff.seamanship, morale: morale(s), hull: s.ship.hull, rigging: s.ship.rigging,
      marines: s.crew.groups.marines, discipline: s.crew.discipline, speed: shipSpeed(s),
    },
    foe: {
      name: e.name, flag: e.flag, broadside: e.broadside, tons: e.tons, crewStart: e.crew, crewNow: e.crew,
      gunnery: clamp(e.gunnery + jitter()), seamanship: clamp(e.seamanship + jitter()), morale: clamp(e.morale + jitter()),
      hull: 100, rigging: 100, speed: e.speed, marines: 0, discipline: 60,
    },
    lines: [],
    result: e.fights ? null : 'won',
    struck: e.fights ? null : 'foe',
  };
  s.battle.foe.value = rng.range(e.prize[0], e.prize[1]);
  // The day's fortune: a lucky shot, a sprung spar, the wind backing. Drawn once per fight.
  s.battle.own.fortune = rng.float(1 - B().fortune, 1 + B().fortune);
  s.battle.foe.fortune = rng.float(1 - B().fortune, 1 + B().fortune);
  if (!e.fights) s.battle.lines.push(`She fires a gun to leeward and strikes her colours.`);
  s.phase = 'battle';
  return s.battle;
}

/** Relative strength of the two ships before skill: the "size" in "drill beats size". */
export function sizeRatio(b) {
  return (b.own.broadside * b.own.crewStart) / (b.foe.broadside * b.foe.crewStart);
}

export function accuracy(side) {
  const b = B();
  return b.accuracyFloor + (1 - b.accuracyFloor) * Math.pow(side.gunnery / 100, b.accuracyExp);
}

export function rateOfFire(side) {
  return B().rateBase + B().rateSkill * side.gunnery / 100;
}

/** One broadside from att into def. Returns what it did. */
export function exchange(att, def, mult, rng, range = 'close') {
  const b = B();
  const mf = b.moraleBase + 0.6 * (att.morale / 100);
  const man = clamp(att.crewNow / att.crewStart, 0.2, 1);
  const landed = att.broadside * accuracy(att) * rateOfFire(att) * mf * man * mult * (att.fortune || 1) * rng.float(0.8, 1.2);
  const hull = Math.min(def.hull, landed * b.hullPerDamage / (def.tons / 100));
  const cas = Math.min(def.crewNow, Math.round(def.crewStart * (hull / 100) * b.casualtyRatio * rng.float(0.7, 1.3)));
  def.hull = clamp(def.hull - hull);
  def.rigging = clamp(def.rigging - hull * (range === 'long' ? 0.9 : 0.4));
  def.crewNow = Math.max(0, def.crewNow - cas);
  return { hull, cas };
}

export function struck(side) {
  const b = B();
  const lostShare = 1 - side.crewNow / side.crewStart;
  const nerve = clamp(side.morale / 60, 0.6, 1.4);
  return side.hull < b.strikeHull * 100 || lostShare > b.strikeCasualties * nerve;
}

function volley(s, rng, ownMult, foeMult, range, label) {
  const bt = s.battle;
  const a = ownMult ? exchange(bt.own, bt.foe, ownMult, rng, range) : null;
  const d = foeMult ? exchange(bt.foe, bt.own, foeMult, rng, range) : null;
  const parts = [];
  if (a) parts.push(`you hit her for ${Math.round(a.hull)} hull and ${a.cas} men`);
  if (d) parts.push(`she hits you for ${Math.round(d.hull)} hull and ${d.cas} men`);
  bt.lines.push(`${label}: ${parts.join('; ')}.`);
  if ((range === 'close' || range === 'board') && rng.chance(range === 'board' ? B().captainKilledBoard : B().captainKilledClose)) {
    s.player.alive = false;
    bt.lines.push('A musket ball from her tops strikes you down on your own quarterdeck.');
  }
}

function checkStrike(s) {
  const bt = s.battle;
  if (!s.player.alive) { bt.result = 'killed'; bt.phase = 'done'; return true; }
  if (struck(bt.foe)) { bt.result = 'won'; bt.struck = 'foe'; bt.phase = 'aftermath'; bt.lines.push('She strikes her colours.'); return true; }
  if (struck(bt.own)) { bt.result = 'lost'; bt.struck = 'own'; bt.phase = 'done'; bt.lines.push('Your ship can fight no more. You strike your colours.'); return true; }
  return false;
}

function escapeChance(bt) {
  return checkChance(bt.own.seamanship + (bt.own.speed - bt.foe.speed) * 1.5, bt.foe.seamanship);
}
function gaugeChance(bt) {
  return checkChance(bt.own.seamanship, bt.foe.seamanship);
}
function rakeChance(bt) {
  const g = bt.gauge === 'own' ? 15 : bt.gauge === 'foe' ? -15 : 0;
  return checkChance(bt.own.seamanship + g, bt.foe.seamanship + 5);
}
function boardChance(bt) {
  const own = bt.own.crewNow * (bt.own.morale / 100) * (1 + bt.own.marines / Math.max(1, bt.own.crewStart)) * (0.6 + bt.own.discipline / 200);
  const foe = bt.foe.crewNow * (bt.foe.morale / 100);
  return clamp(0.5 + (own / Math.max(1, foe) - 1) * 0.6, 0.05, 0.95);
}

/** Options for the current phase, each with its odds band derived from the same chance functions. */
export function battleOptions(s) {
  const bt = s.battle;
  if (!bt) return [];
  switch (bt.phase) {
    case 'approach': return [
      { id: 'gauge', label: 'Work to windward for the weather gauge', tags: ['drill', 'fair', 'bold'], stake: `Seamanship: ${band(gaugeChance(bt))}. The gauge lets you choose the range and helps a rake.` },
      { id: 'colours', label: 'Show false colours and close', tags: ['bold', 'initiative'], stake: `Seamanship: ${band(checkChance(bt.own.seamanship, bt.foe.seamanship - 10))}. Lawful until you open fire. Success: a first broadside unanswered.` },
      { id: 'refuse', label: 'Refuse action and make sail', tags: ['cautious'], stake: `Speed and seamanship: ${band(escapeChance(bt))}. ${sizeRatio(bt) > 1 ? 'She is the weaker ship: the service will notice.' : 'No shame against a heavier ship.'}` },
    ];
    case 'engage': return [
      { id: 'long', label: 'Engage at long range', tags: ['cautious', 'drill'], stake: 'Three broadsides at long range. Slower and safer; the better gunnery tells.' },
      { id: 'close', label: 'Close to pistol shot', tags: ['bold', 'fair'], stake: 'Two broadsides yardarm to yardarm. Decisive and bloody for both.' },
      { id: 'rake', label: 'Cross her bow and rake her', tags: ['bold', 'initiative'], stake: `Seamanship: ${band(rakeChance(bt))}${bt.gauge === 'own' ? ', with the gauge' : bt.gauge === 'foe' ? ', against the gauge' : ''}. Success: a raking broadside down her length. Failure: she rakes you.` },
    ];
    case 'decide': return [
      { id: 'pound', label: 'Batter her until she strikes', tags: ['fair', 'cautious', 'obey'], stake: `Up to ${B().poundVolleys} more broadsides at close range.` },
      { id: 'board', label: 'Board her', tags: ['bold'], stake: `Boarding: ${band(boardChance(bt))}. You have ${bt.own.crewNow} men to her ${bt.foe.crewNow}. Brutal and costly either way.` },
      { id: 'break', label: 'Break off the action', tags: ['cautious'], stake: `Getting clear: ${band(escapeChance(bt))}. ${sizeRatio(bt) > 1 ? 'Breaking off from a weaker ship will be remembered.' : 'Breaking off from a heavier ship is no disgrace.'}` },
    ];
    case 'aftermath': {
      const prizeCrew = prizeCrewSize(bt);
      return [
        { id: 'prize', label: 'Put a prize crew aboard and send her in', tags: ['bold', 'fair', 'obey'], stake: `${prizeCrew} men leave the ship. She is worth about £${Math.round(bt.foe.value / 100) * 100}; your share comes on reaching port.` },
        { id: 'burn', label: 'Take off her people and burn her', tags: ['cautious', 'cheap'], stake: `No men lost to a prize crew. Head money only: £5 a man of her crew, shared.` },
      ];
    }
    default: return [{ id: 'continue', label: 'Continue', tags: ['fair'], stake: '' }];
  }
}

export function prizeCrewSize(bt) {
  return Math.max(4, Math.round(bt.foe.crewStart * 0.08));
}

/** Resolve one battle decision. */
export function battleChoose(s, id, rng) {
  const bt = s.battle;
  const b = B();
  switch (bt.phase) {
    case 'approach': {
      if (id === 'gauge') {
        bt.gauge = rng.chance(gaugeChance(bt)) ? 'own' : 'foe';
        bt.lines.push(bt.gauge === 'own' ? 'You weather on her and hold the gauge.' : 'She out-sails you to windward. She has the gauge.');
      } else if (id === 'colours') {
        bt.surprise = rng.chance(checkChance(bt.own.seamanship, bt.foe.seamanship - 10));
        bt.lines.push(bt.surprise ? 'She takes you for a friend until you run up your true colours and fire.' : 'She is not deceived.');
      } else if (id === 'refuse') {
        if (rng.chance(escapeChance(bt))) {
          bt.result = 'avoided'; bt.phase = 'done';
          bt.lines.push('You crowd on sail and run her hull-down by nightfall.');
          return;
        }
        bt.gauge = 'foe';
        bt.lines.push('She comes up with you. You must fight.');
      }
      bt.phase = 'engage';
      return;
    }
    case 'engage': {
      const gaugeMult = bt.gauge === 'own' ? 1.1 : 1;
      if (bt.surprise) volley(s, rng, 1.0, 0, 'close', 'Your first broadside, unanswered');
      if (checkStrike(s)) return;
      if (id === 'long') {
        for (let i = 1; i <= 3; i++) {
          volley(s, rng, b.rangeMult.long * gaugeMult, b.rangeMult.long, 'long', `Long range, broadside ${i}`);
          if (checkStrike(s)) return;
        }
      } else if (id === 'close') {
        for (let i = 1; i <= 2; i++) {
          volley(s, rng, b.rangeMult.close * gaugeMult, b.rangeMult.close, 'close', `Pistol shot, broadside ${i}`);
          if (checkStrike(s)) return;
        }
      } else if (id === 'rake') {
        if (rng.chance(rakeChance(bt))) volley(s, rng, b.rakeMult, 0, 'close', 'You cross her bow and rake her');
        else volley(s, rng, 0, b.raked, 'close', 'She luffs up and rakes you');
        if (checkStrike(s)) return;
        volley(s, rng, 1.0, 1.0, 'close', 'Yardarm to yardarm');
        if (checkStrike(s)) return;
      }
      bt.phase = 'decide';
      return;
    }
    case 'decide': {
      if (id === 'pound') {
        for (let i = 1; i <= b.poundVolleys; i++) {
          volley(s, rng, 1.0, 1.0, 'close', `Close action, broadside ${i}`);
          if (checkStrike(s)) return;
        }
      } else if (id === 'board') {
        const p = boardChance(bt);
        const own = Math.round(bt.own.crewNow * rng.float(0.08, 0.16));
        const foe = Math.round(bt.foe.crewNow * rng.float(0.12, 0.22));
        bt.own.crewNow -= own; bt.foe.crewNow -= foe;
        if (rng.chance(b.captainKilledBoard)) { s.player.alive = false; bt.lines.push('You lead the boarders and do not come back.'); }
        if (!s.player.alive) { bt.result = 'killed'; bt.phase = 'done'; return; }
        if (rng.chance(p)) {
          bt.lines.push(`Boarders away. Cutlass and pike on her deck: you lose ${own}, she loses ${foe}, and her people throw down their arms.`);
          bt.result = 'won'; bt.struck = 'foe'; bt.phase = 'aftermath';
          return;
        }
        bt.lines.push(`The boarders are thrown back: you lose ${own}, she loses ${foe}.`);
        bt.own.morale = clamp(bt.own.morale - 12);
        volley(s, rng, 1.0, 1.0, 'close', 'Close action resumes');
        if (checkStrike(s)) return;
      } else if (id === 'break') {
        if (rng.chance(escapeChance(bt))) {
          bt.result = 'broke'; bt.phase = 'done';
          bt.lines.push('You haul off and she does not follow.');
          return;
        }
        bt.lines.push('She will not let you go.');
        volley(s, rng, 1.0, 1.0, 'close', 'Running fight');
        if (checkStrike(s)) return;
      }
      bt.result = 'drawn'; bt.phase = 'done';
      bt.lines.push('Night falls on two battered ships. She makes off in the dark.');
      return;
    }
    case 'aftermath': {
      const value = id === 'prize' ? bt.foe.value : bt.foe.crewStart * 5;
      const flag = ORDER_TYPES[s.commission.orders].flagShare;
      const share = Math.round(value * captainShare(s, flag));
      s.prizesPending.push({ name: `${bt.foe.flag} ${bt.foe.name}`, value, share, burnt: id !== 'prize' });
      if (id === 'prize') {
        const n = Math.min(prizeCrewSize(bt), s.crew.groups.ordinary + s.crew.groups.able);
        const fromOrd = Math.min(n, s.crew.groups.ordinary);
        s.crew.groups.ordinary -= fromOrd;
        s.crew.groups.able -= n - fromOrd;
        bt.lines.push(`${n} men go across as her prize crew.`);
        s.record.prizes++;
      } else {
        bt.lines.push('She burns to the waterline.');
      }
      s.record.prizeValue += value;
      bt.phase = 'done';
      return;
    }
    default:
      return;
  }
}

/** Write the battle back into the ship and the career. Returns the outcome. */
export function closeBattle(s, rng) {
  const bt = s.battle;
  const fought = ENEMIES[bt.kind].fights && bt.result !== 'avoided';
  const lost = bt.own.crewStart - bt.own.crewNow;
  s.ship.hull = bt.own.hull;
  s.ship.rigging = bt.own.rigging;
  if (lost > 0) {
    const surgeon = officer(s, 'surgeon');
    const saved = 0.45 + 0.35 * ((surgeon ? surgeon.competence : 30) / 100);
    const dead = Math.round(lost * (0.35 + 0.65 * (1 - saved)));
    removeMen(s, dead);
    s.record.killed += dead;
    bt.lines.push(`${dead} dead or dying; ${lost - dead} wounded who will recover.`);
  }
  if (fought) s.record.actions++;
  const ratio = sizeRatio(bt);
  const d = s.crew.drivers;
  const rep = s.player.rep;
  if (bt.result === 'won') {
    if (fought) {
      s.record.won++;
      s.record.shipsTaken++;
      const glory = clamp(1 + 3 / Math.max(0.4, ratio), 1, 8);
      rep.service = clamp(rep.service + glory);
      rep.public = clamp(rep.public + glory * (bt.kind === 'privateer' ? 0.3 : 1));
      d.trust = clamp(d.trust + 8);
    }
    d.prospects = clamp(d.prospects + 10);
    if (s.commission.departed) s.commission.departurePaid = true;
  } else if (bt.result === 'lost') {
    s.record.lost++;
    s.record.shipsLost++;
  } else if (bt.result === 'broke' || bt.result === 'avoided') {
    if (fought || bt.result === 'avoided') {
      if (ratio > 1) { rep.service = clamp(rep.service - 6); d.trust = clamp(d.trust - 6); }
      s.record.fled++;
    }
  } else if (bt.result === 'drawn') {
    rep.service = clamp(rep.service + 2);
  }
  log(s, `${bt.foe.flag} ${bt.foe.name}: ${{ won: 'taken', lost: 'you struck', drawn: 'drawn', broke: 'you broke off', avoided: 'avoided', killed: 'you fell' }[bt.result]}.`, 'battle');
  const out = bt.result;
  s.lastBattle = { kind: bt.kind, result: bt.result, lines: bt.lines.slice(), foe: `${bt.foe.flag} ${bt.foe.name}` };
  s.battle = null;
  return out;
}

/** Take men off the books, spread across the groups in proportion. */
export function removeMen(s, n) {
  const g = s.crew.groups;
  let left = n;
  const keys = ['able', 'ordinary', 'landsmen', 'pressed', 'marines'];
  const total = keys.reduce((a, k) => a + g[k], 0) || 1;
  for (const k of keys) {
    const take = Math.min(g[k], Math.round((n * g[k]) / total));
    g[k] -= take; left -= take;
  }
  for (const k of keys) { while (left > 0 && g[k] > 0) { g[k]--; left--; } }
}
