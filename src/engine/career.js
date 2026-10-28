// Commissions, returns to port, promotion, courts-martial and mutiny outcomes
// (brief sections 5, 6.5, 6.6). Every judgement the Admiralty makes is written
// into the report with its reasons, so the career never feels random (risk table).

import { CONFIG } from '../data/config.data.js';
import { ACTS, SUPERIORS } from '../data/acts.data.js';
import { CLASS_LADDER, SHIP_CLASSES } from '../data/ships.data.js';
import { ORDER_TYPES, STATIONS } from '../data/orders.data.js';
import { streamFor } from './rng.js';
import { clamp, postingScore, lashRate, round1, crewTotal } from './derive.js';
import { dayOf, formatDay, yearOf } from './calendar.js';
import { assignShip, openPort, log, money, makeOfficers } from './state.js';
import { fireHistory } from './week.js';

export function currentCommissionDef(s) {
  const act = ACTS[s.act];
  return act && act.commissions[s.com];
}

/** Which class the Admiralty offers, with the reason. */
export function offeredClass(s) {
  if (s.player.rank === 'commander') return { cls: 'sloop', reason: 'A commander commands a sloop.' };
  const score = postingScore(s).total;
  let i = score >= 62 ? 3 : score >= 44 ? 2 : 1;
  if (s.act < 3 && i === 3) i = 2; // heavy frigates are for the last war
  return { cls: CLASS_LADDER[i], reason: `Posting score ${score}: ${['', 'a small frigate', 'a standard frigate', 'a heavy frigate'][i]}.` };
}

/** Called from port when the captain puts to sea. */
export function startCommission(s) {
  const def = currentCommissionDef(s);
  s.commission = {
    id: def.id, orders: def.orders, station: def.station, superior: def.superior,
    weeks: def.weeks, week: 0, enemies: { ...def.enemies }, finale: def.finale || null,
    tutorial: !!def.tutorial, departed: false, departurePaid: false, convoyLost: 0,
    startRecord: { ...s.record }, startDay: s.day,
  };
  s.phase = 'sea';
  s.port = null;
  log(s, `Sailed for ${STATIONS[def.station]}. ${ORDER_TYPES[def.orders].label}: ${def.note}`, 'orders');
}

/** Prepare the next port: the ship for the next commission, or the act break. */
export function prepareCommission(s) {
  const def = currentCommissionDef(s);
  const rng = streamFor(s.seed, s.turn, 'posting');
  // The calendar jumps to three weeks before the commission sails.
  const target = dayOf(def.start) - 21;
  const gapWeeks = Math.max(0, Math.round((target - s.day) / 7));
  if (gapWeeks > 0) {
    // Between commissions: in harbour on full pay, without the table at sea.
    money(s, gapWeeks * (s.onHalfPay ? CONFIG.halfPayPerWeek - 4 : CONFIG.payPerWeek[s.player.rank] - 2), s.onHalfPay ? 'Half pay, less living ashore' : 'Pay in harbour');
    s.day = target;
  }
  s.onHalfPay = false;
  advancePostList(s);
  fireHistory(s, false);
  const off = offeredClass(s);
  const score = postingScore(s).total;
  if (s.player.rank === 'captain' && score < CONFIG.postingFloor && !s.flags.skippedLast && s.act > 1) {
    // No ship: the war goes on without you for this commission.
    s.flags.skippedLast = true;
    s.onHalfPay = true;
    s.reports.push({ day: s.day, title: 'No ship', lines: [`The Admiralty has no ship for you. Posting score ${score}, below the ${CONFIG.postingFloor} that gets a command. Interest and service reputation raise it.`] });
    log(s, 'No ship offered. Half pay.', 'career');
    s.player.interest = clamp(s.player.interest + 3); // time spent lobbying
    nextCommission(s);
    return;
  }
  s.flags.skippedLast = false;
  if (!s.ship || s.ship.lost || s.ship.cls !== off.cls) {
    const prevName = s.ship && !s.ship.lost ? s.ship.name : null;
    assignShip(s, off.cls, rng, { fresh: !s.crew });
    if (s.ship.name === prevName) s.ship.name = `${s.ship.name} II`;
    s.officers = makeOfficers(s, rng).map((o, i) => (s.officers[i] && s.officers[i].status === 'aboard' && s.officers[i].loyalty >= 55 && o.post !== 'mid1' && o.post !== 'mid2' ? { ...s.officers[i], curbed: s.officers[i].curbed } : o));
    log(s, `Appointed to the ${SHIP_CLASSES[off.cls].name} ${s.ship.name}. ${off.reason}`, 'career');
  }
  openPort(s, def.station === 'med' ? 'Gibraltar' : def.station === 'lisbon' ? 'Plymouth' : def.station === 'northatlantic' ? 'Halifax' : 'Portsmouth');
}

function nextCommission(s) {
  const act = ACTS[s.act];
  if (s.com + 1 < act.commissions.length) {
    s.com++;
    prepareCommission(s);
    return;
  }
  // Act break.
  s.phase = 'interlude';
  s.interlude = { ending: act.ending, nextAct: s.act + 1 };
}

/** Move on the post list by the years elapsed since the last check. */
export function advancePostList(s) {
  if (s.player.rank !== 'captain') return;
  const years = (s.day - (s.player.postCheckDay ?? s.day)) / 365.25;
  s.player.postList = Math.max(0, Math.round(s.player.postList - years * CONFIG.postListAdvancePerYear));
  s.player.postCheckDay = s.day;
}

function makePost(s, lines) {
  s.player.rank = 'captain';
  s.player.postDay = s.day;
  s.player.postList = CONFIG.postListStart;
  s.player.postCheckDay = s.day;
  lines.push(`You are made post: captain, with seniority from ${formatDay(s.day)}. From here promotion is by seniority alone.`);
  log(s, 'Made post.', 'career');
}

/** Performance at the end of Act 1, or on a later return while still a commander. */
export function promotionScore(s) {
  const r = s.record;
  return round1(s.player.rep.service * 0.6 + s.player.interest * 0.5 + r.won * 6 + Math.min(10, r.prizes * 2) - r.mutinies * 10);
}

export function promotionThreshold(s) {
  return CONFIG.madePostThreshold - 8 * (s.flags.postChecks || 0);
}

/**
 * The commission is over: pay prizes, write the superior's report and the
 * Gazette, and move the career on. Sets s.phase = 'report'.
 */
export function endCommission(s, cause = 'complete') {
  const c = s.commission;
  const sup = SUPERIORS[c.superior];
  const r = s.record;
  const st = c.startRecord;
  const lines = [];
  const rep = s.player.rep;
  let evaln = 0;
  const why = [];

  // Prize money
  let paid = 0;
  for (const p of s.prizesPending) {
    money(s, p.share, `Prize money: ${p.name}`);
    paid += p.share;
    lines.push(`${p.burnt ? 'Head money' : 'Prize'}: the ${p.name}, valued at £${p.value}. Your share £${p.share}.`);
  }
  if (s.prizesPending.length) s.crew.drivers.prospects = clamp(s.crew.drivers.prospects + 4 * s.prizesPending.length);
  s.prizesPending = [];

  if (cause === 'complete') {
    const won = r.won - st.won;
    if (won) { evaln += 3 * won; why.push(`${won} action${won > 1 ? 's' : ''} won`); }
    const prizes = r.prizes - st.prizes;
    if (prizes) { evaln += Math.min(4, prizes); why.push(`${prizes} prize${prizes > 1 ? 's' : ''}`); }
    if (c.convoyLost) { evaln -= 4 * c.convoyLost; why.push(`${c.convoyLost} merchantm${c.convoyLost > 1 ? 'en' : 'an'} lost under your protection`); }
    if (c.departed) {
      const v = c.departurePaid ? 3 + 4 * sup.initiative : -2 + 3 * sup.initiative;
      evaln += v;
      why.push(c.departurePaid ? `left your orders and it paid (${sup.name} ${sup.initiative >= 0 ? 'approves' : 'does not like it even so'})` : `left your orders for nothing (${sup.name} ${sup.initiative > 0 ? 'forgives it' : 'notes it'})`);
    }
    const rate = lashRate(s);
    if (sup.discipline && s.record.weeksAtSea > 4) {
      const v = clamp(sup.discipline * (rate - 100) / 50, -6, 6);
      if (Math.abs(v) >= 1) { evaln += v; why.push(`punishment record (${rate} lashes per 100 men a year) ${v > 0 ? 'approved' : 'counted against you'} by ${sup.name}`); }
    }
    if (s.ship.hull < 40) { evaln -= 2; why.push('ship brought in badly knocked about'); }
    if ((c.slackWeeks || 0) > c.weeks * 0.25) { evaln -= 6; why.push(`a slack ship: discipline gone for ${c.slackWeeks} of ${c.weeks} weeks`); }
  }
  evaln = round1(evaln);
  // The service forgets: a tenth of the way back toward an ordinary name each
  // commission, so an early action does not carry a whole career.
  rep.service = clamp(rep.service + (40 - rep.service) * 0.1 + evaln);
  rep.public = clamp(rep.public + (15 - rep.public) * 0.1);
  lines.unshift(`${sup.name}'s report: ${evaln >= 0 ? '+' : ''}${evaln} to your service reputation${why.length ? ` (${why.join('; ')})` : ' (an unremarkable commission)'}.`);
  if (r.won - st.won > 0 && rep.public > 25) lines.push('Your letter is printed in the Gazette.');

  // Interest follows the patron and your standing.
  const di = round1((rep.service - 40) / 15 + (s.patron.standing - 50) / 25);
  s.player.interest = clamp(s.player.interest + di);
  lines.push(`Interest ${di >= 0 ? '+' : ''}${di}: your patron, ${s.patron.name}, and your name in the service.`);

  // Midshipmen and lieutenants recommended through the commission
  // Promotion to post
  if (s.player.rank === 'commander' && cause === 'complete') {
    const sc = promotionScore(s);
    const th = promotionThreshold(s);
    s.flags.postChecks = (s.flags.postChecks || 0) + 1;
    if (sc >= th) makePost(s, lines);
    else lines.push(`Not yet made post: performance ${sc} against the ${th} the Admiralty wants. Service reputation, interest and actions won raise it.`);
  }

  s.reports.push({ day: s.day, title: `End of commission: ${formatDay(s.day)}`, lines });
  log(s, `Commission over. ${lines[0]}`, 'career');
  s.lastReport = s.reports[s.reports.length - 1];
  s.commission = null;
  s.phase = 'report';
}

/** After the report screen. */
export function afterReport(s) {
  if (s.ending) { s.phase = 'ended'; return; }
  if (s.money < CONFIG.debtRuin) { finish(s, 'debt'); return; }
  nextCommission(s);
}

/** Act transitions: the interlude screen's options. */
export function interludeOptions(s) {
  const il = s.interlude;
  if (il.ending === 'amiens') {
    return [
      { id: 'country', label: 'Live quietly in the country on half pay', tags: ['cheap', 'cautious'], stake: 'Half pay covers it, nearly. Interest fades.' },
      { id: 'london', label: 'Take rooms in London and wait on the Admiralty', tags: ['bold', 'initiative'], stake: 'Costs £250. Interest up; your patron hears of you.' },
    ];
  }
  if (il.ending === 'peace') return [{ id: 'continue', label: 'Go ashore', tags: ['fair'], stake: 'The war is over.' }];
  return [{ id: 'continue', label: 'Continue', tags: ['fair'], stake: '' }];
}

export function interludeText(s) {
  const il = s.interlude;
  const next = ACTS[il.nextAct];
  const head = interludeHead(s);
  return next ? `${head}${head ? '\n\n' : ''}Act ${next.id}, ${next.title} (${next.years}). ${next.intro}` : head;
}

function interludeHead(s) {
  const il = s.interlude;
  if (!il.ending) return 'The Glorious First of June is over and Lord Howe\'s dispatches are in London.';
  if (il.ending === 'amiens') return 'The Peace of Amiens. Most of the fleet is paid off and you go ashore on half pay, with every other captain in England asking for the few ships kept in commission. It lasts fourteen months.';
  if (il.ending === 'continental') return 'By 1807 Napoleon rules Europe from the Channel to the Vistula and has closed its ports to British trade. At sea there is no French fleet left to fight; what remains is convoys, blockades and the coast of Spain.';
  if (il.ending === 'peace') return 'Waterloo. Napoleon goes to St Helena and the navy goes home. Within a year most of the fleet is laid up and most captains are ashore on half pay, for good.';
  return '';
}

export function interludeChoose(s, id) {
  const il = s.interlude;
  if (il.ending === 'amiens') {
    // March 1802 to May 1803 ashore.
    const weeks = Math.round((dayOf('1803-04-20') - s.day) / 7);
    money(s, weeks * (CONFIG.halfPayPerWeek - 4), 'Half pay, less living ashore, during the peace');
    if (id === 'london') { money(s, -250, 'Rooms in London, waiting on the Admiralty'); s.player.interest = clamp(s.player.interest + 8); s.patron.standing = clamp(s.patron.standing + 5); } else s.player.interest = clamp(s.player.interest - 4);
    s.day = Math.max(s.day, dayOf('1803-04-20'));
    // The ship is paid off: a new commission means a new ship's company.
    if (s.ship) s.ship.lost = true;
    if (s.money < CONFIG.debtRuin) { finish(s, 'debt'); return; }
  }
  if (il.ending === 'peace') { finish(s, 'peace'); return; }
  s.act = il.nextAct;
  s.com = 0;
  s.interlude = null;
  log(s, `Act ${ACTS[s.act].id}: ${ACTS[s.act].title}. ${ACTS[s.act].intro}`, 'act');
  prepareCommission(s);
}

// ---- mutiny outcomes and courts-martial ---------------------------------------

export function mutinyOutcome(s, kind, rng) {
  const lines = [];
  const d = s.crew.drivers;
  s.record.mutinies++;
  if (kind === 'violent' && d.fairness < 25) {
    lines.push('They come for you on the quarterdeck. It is the Hermione again, and you are Pigot.');
    s.player.alive = false;
    return finish(s, 'mutiny', lines);
  }
  if (kind === 'violent' || kind === 'outbreak') {
    lines.push('The mutineers put you and your officers into the launch and steer for an enemy port. You reach a British ship after three days.');
    s.ship.lost = true;
    s.record.shipsLost++;
    return courtMartial(s, 'seized', rng, lines);
  }
  if (kind === 'strike') {
    lines.push('The men return to duty when you agree to forward their grievances. A court of inquiry follows; the Admiralty is not pleased with captains whose ships strike.');
    const worst = Object.entries(d).sort((a, b) => a[1] - b[1])[0][0];
    d[worst] = clamp(d[worst] + 15);
    s.crew.grievance = 5;
    s.crew.stage = 0;
    s.player.rep.service = clamp(s.player.rep.service - 8);
    if (d.trust < 30) {
      lines.push('As at Spithead, the men demand their captain be replaced. The Admiralty agrees.');
      s.ship.lost = true;
    }
    s.reports.push({ day: s.day, title: 'Mutiny', lines });
    endCommission(s, 'mutiny');
    return;
  }
  if (kind === 'suppressed') {
    lines.push('The marines hold. The ringleaders are tried by court-martial and hanged at the yardarm, with the whole ship\'s company made to watch.');
    const ring = s.named.find((n) => n.id === 'ringleader' && n.status === 'aboard');
    if (ring) ring.status = 'hanged';
    s.crew.discipline = clamp(s.crew.discipline + 15);
    d.fairness = clamp(d.fairness - 10);
    d.trust = clamp(d.trust - 6);
    s.crew.grievance = 10;
    s.crew.stage = 0;
    s.player.rep.service = clamp(s.player.rep.service - 2);
    lines.forEach((l) => log(s, l, 'mutiny'));
    s.phase = 'sea';
  }
}

/** Losing a ship meant an automatic court-martial. */
export function courtMartial(s, cause, rng, lines = []) {
  s.record.courtsMartial++;
  const rep = s.player.rep.service;
  let pDismiss;
  if (cause === 'captured') {
    const honour = s.lastBattle && s.lastBattle.result === 'lost';
    pDismiss = honour ? 0.04 : 0.3;
    lines.push('Court-martial for the loss of your ship, taken in action. The court asks whether everything possible was done.');
  } else if (cause === 'wreck') {
    pDismiss = clamp(0.35 - rep / 200, 0.05, 0.4);
    lines.push('Court-martial for the loss of your ship by shipwreck. The master\'s log is read into the record.');
  } else {
    pDismiss = clamp(0.4 - rep / 200 + (s.crew.drivers.fairness < 30 ? 0.2 : 0), 0.05, 0.6);
    lines.push('Court-martial for the loss of your ship to her own crew. The court reads your punishment book.');
  }
  if (rng.chance(pDismiss)) {
    lines.push('Sentence: dismissed the service.');
    return finish(s, 'dismissed', lines);
  }
  lines.push(cause === 'captured' ? 'Honourably acquitted. Your sword is returned to you.' : 'Acquitted, but the court\'s remarks are noted at the Admiralty.');
  s.player.rep.service = clamp(s.player.rep.service + (cause === 'captured' ? -2 : -12));
  s.player.interest = clamp(s.player.interest - (cause === 'captured' ? 2 : 8));
  s.ship.lost = true;
  s.reports.push({ day: s.day, title: 'Court-martial', lines });
  lines.forEach((l) => log(s, l, 'career'));
  s.prizesPending = [];
  endCommission(s, 'lost');
}

// ---- ending ------------------------------------------------------------------

export function finish(s, kind, lines = []) {
  lines.forEach((l) => log(s, l, 'career'));
  advancePostList(s);
  s.ending = { kind, day: s.day, lines };
  s.phase = 'ended';
  s.pending = null;
  s.battle = null;
}

export { yearOf, crewTotal };
