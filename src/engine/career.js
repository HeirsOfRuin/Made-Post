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
    course: 'patrol', plan: null, raidCooldown: 0,
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
  lines.push(`You are made post: promoted to captain from ${formatDay(s.day)}. From now on you rise only by seniority, as the captains above you die or are promoted.`);
  log(s, 'Made post.', 'career');
}

/** Performance at the end of Act 1, or on a later return while still a commander. */
export function promotionScore(s) {
  const r = s.record;
  return round1(s.player.rep.service * 0.6 + s.player.interest * 0.5 + r.won * 6 + Math.min(10, r.prizes * 2) - r.mutinies * 10 + (s.flags.dispatch ? CONFIG.dispatchBonus : 0));
}

/** Each return lowers the bar: the navy grew fast and needed captains. */
export function promotionThreshold(s) {
  return CONFIG.madePostThreshold - CONFIG.madePostEase * (s.flags.postChecks || 0);
}

/** An act's opening words, as they apply to this player. */
export function actIntro(s, act) {
  return s.player.rank === 'commander' && act.introCommander ? act.introCommander : act.intro;
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
    lines.push(`${p.burnt ? 'Head money for' : 'Prize money for'} the ${p.name} (valued at £${p.value}): your share is £${p.share}.`);
  }
  if (s.prizesPending.length) s.crew.drivers.prospects = clamp(s.crew.drivers.prospects + 4 * s.prizesPending.length);
  s.prizesPending = [];

  if (cause === 'complete') {
    const won = r.won - st.won;
    if (won) { evaln += 3 * won; why.push(`${won} fight${won > 1 ? 's' : ''} won`); }
    const prizes = r.prizes - st.prizes;
    if (prizes) { evaln += Math.min(4, prizes); why.push(`${prizes} ship${prizes > 1 ? 's' : ''} captured`); }
    if (c.convoyLost) { evaln -= 4 * c.convoyLost; why.push(`${c.convoyLost} merchant ship${c.convoyLost > 1 ? 's' : ''} lost while in your care`); }
    if (c.departed) {
      const v = c.departurePaid ? 3 + 4 * sup.initiative : -2 + 3 * sup.initiative;
      evaln += v;
      why.push(c.departurePaid ? `you broke your orders and it paid off (${sup.initiative >= 0 ? 'he approves' : 'he dislikes it even so'})` : `you broke your orders and gained nothing (${sup.initiative > 0 ? 'he lets it pass' : 'he notes it'})`);
    }
    const rate = lashRate(s);
    if (sup.discipline && s.record.weeksAtSea > 4) {
      const v = clamp(sup.discipline * (rate - 100) / 50, -6, 6);
      if (Math.abs(v) >= 1) { evaln += v; why.push(`your punishment record (${rate} lashes a year per 100 men) ${v > 0 ? 'meets with his approval' : 'counts against you'}`); }
    }
    if (s.ship.hull < 40) { evaln -= 2; why.push('the ship came home badly damaged'); }
    if ((c.slackWeeks || 0) > c.weeks * 0.25) { evaln -= 6; why.push(`a slack ship: discipline broke down for ${c.slackWeeks} of ${c.weeks} weeks`); }
  }
  evaln = round1(evaln);
  // The service forgets: a tenth of the way back toward an ordinary name each
  // commission, so an early action does not carry a whole career.
  rep.service = clamp(rep.service + (40 - rep.service) * 0.1 + evaln);
  rep.public = clamp(rep.public + (15 - rep.public) * 0.1);
  lines.unshift(`${sup.name}'s report on you is ${evaln >= 4 ? 'warm' : evaln > 0 ? 'favourable' : evaln === 0 ? 'neutral' : evaln > -4 ? 'cool' : 'damning'} (${evaln >= 0 ? '+' : ''}${evaln} to your name in the navy). ${why.length ? `He notes: ${why.join('; ')}.` : 'Nothing out of the ordinary.'}`);
  if (r.won - st.won > 0 && rep.public > 25) lines.push('Your report of the fight is printed in the London Gazette, the official newspaper. The public know your name.');

  // Interest follows the patron and your standing.
  const di = round1((rep.service - 40) / 15 + (s.patron.standing - 50) / 25);
  s.player.interest = clamp(s.player.interest + di);
  lines.push(`Influence ${di >= 0 ? '+' : ''}${Math.round(di)}: from your patron, ${s.patron.name}, and your name in the navy.`);

  // Midshipmen and lieutenants recommended through the commission
  // Promotion to post
  if (s.player.rank === 'commander' && cause === 'complete') {
    const sc = promotionScore(s);
    const th = promotionThreshold(s);
    s.flags.postChecks = (s.flags.postChecks || 0) + 1;
    if (sc >= th) makePost(s, lines);
    else lines.push(`Not promoted this time: the Admiralty looked for a record of ${th}, and yours is ${Math.round(sc)}. Your next chance comes when you return from your next voyage, and the bar will be lower: the navy needs captains. Fights won, prizes, your name in the navy and your influence all count.`);
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
      { id: 'country', label: 'Live quietly in the country on half pay', tags: ['cheap', 'cautious'], stake: 'Half pay nearly covers it. People at the Admiralty forget you: influence falls.' },
      { id: 'london', label: 'Take rooms in London and keep calling at the Admiralty', tags: ['bold', 'initiative'], stake: 'Costs £250. Influence rises, and your patron hears of you.' },
    ];
  }
  if (il.ending === 'peace') return [{ id: 'continue', label: 'Go ashore', tags: ['fair'], stake: 'The war is over.' }];
  return [{ id: 'continue', label: 'Continue', tags: ['fair'], stake: '' }];
}

export function interludeText(s) {
  const il = s.interlude;
  const next = ACTS[il.nextAct];
  return { head: interludeHead(s), act: next ? { id: next.id, title: next.title, years: next.years, intro: actIntro(s, next) } : null };
}

function interludeHead(s) {
  const il = s.interlude;
  if (!il.ending) {
    const named = s.flags.dispatch ? 'Your sloop is named in Lord Howe\'s dispatch, ' : 'Lord Howe\'s dispatch does not mention you; it leaves out half the officers who fought, and there is an outcry, ';
    return s.player.rank === 'captain'
      ? `The Glorious First of June is won and the news is in London. ${named}and the Admiralty\'s list of promotions includes your name: you are made post. A frigate will follow.`
      : `The Glorious First of June is won and the news is in London. ${named}but when the list of promotions comes out, your name is not on it. Many good commanders were passed over that summer. You keep your sloop, and your chance.`;
  }
  if (il.ending === 'amiens') return 'March 1802: the Peace of Amiens. Britain and France stop fighting. Most of the navy\'s ships are laid up and their officers sent home on half pay. You are one of them. The peace lasts fourteen months.';
  if (il.ending === 'continental') return 'By 1807 Napoleon rules most of Europe and has closed its ports to British trade. After Trafalgar there is no French fleet left that can face the British at sea. What remains is convoys, blockades and the coast of Spain.';
  if (il.ending === 'peace') return 'June 1815: Waterloo. Napoleon is sent into exile on St Helena and the long war is over. Within a year most of the fleet is laid up, and most captains go home on half pay for good.';
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
  log(s, `Act ${ACTS[s.act].id}: ${ACTS[s.act].title}. ${actIntro(s, ACTS[s.act])}`, 'act');
  prepareCommission(s);
}

// ---- mutiny outcomes and courts-martial ---------------------------------------

export function mutinyOutcome(s, kind, rng) {
  const lines = [];
  const d = s.crew.drivers;
  s.record.mutinies++;
  if (kind === 'violent' && d.fairness < 25) {
    lines.push('They come for you on deck. It is the Hermione again, and you are Pigot.');
    s.player.alive = false;
    return finish(s, 'mutiny', lines);
  }
  if (kind === 'violent' || kind === 'outbreak') {
    lines.push('The mutineers put you and your officers into a boat and sail the ship to an enemy port. After three days at sea you are picked up by a British ship.');
    s.ship.lost = true;
    s.record.shipsLost++;
    return courtMartial(s, 'seized', rng, lines);
  }
  if (kind === 'strike') {
    lines.push('The men go back to work when you agree to pass their complaints to the Admiralty. An inquiry follows; the Admiralty does not like captains whose crews refuse duty.');
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
    lines.push('The marines hold. The leaders are tried by court-martial and hanged from the ship\'s yardarm, with the whole crew made to watch.');
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
    lines.push('Court-martial for the loss of your ship by shipwreck. The ship\'s log is read out in court.');
  } else {
    pDismiss = clamp(0.4 - rep / 200 + (s.crew.drivers.fairness < 30 ? 0.2 : 0), 0.05, 0.6);
    lines.push('Court-martial for the loss of your ship to her own crew. The court reads your punishment book.');
  }
  if (rng.chance(pDismiss)) {
    lines.push('Sentence: dismissed from the navy.');
    return finish(s, 'dismissed', lines);
  }
  lines.push(cause === 'captured' ? 'Honourably acquitted: you did all a man could. Your sword is handed back to you.' : 'Acquitted, but the court\'s remarks are noted at the Admiralty.');
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
