// Taking command: the opening, one decision per screen. It replaces the first
// port visit, so a new player meets the ship, the officers, the men and the
// way the ship will be run one at a time, in story order, before any numbers.
// Each choice is read by the engine (the inert check covers them).

import { streamFor } from './rng.js';
import { clamp, baseSkill, crewTotal, complement } from './derive.js';
import { money, log, officer } from './state.js';
import { FORENAMES, SURNAMES } from '../data/cast.data.js';

export const SETUP_STEPS = ['letter', 'officers', 'men', 'command'];

/** The screens. text(s) is the story; options carry a short plain line each. */
export const SETUP = {
  letter: {
    title: 'Your first command',
    text: (s) => [
      `March 1794. Britain has been at war with Revolutionary France for a year.`,
      `You are Commander ${s.player.name} of the Royal Navy, and this morning a letter from the Admiralty names you to your first ship: HMS ${s.ship.name}, a sloop of sixteen guns lying at Portsmouth.`,
      `A sloop is the smallest ship a commander can hold. Do well in her and you will be "made post": promoted to captain, the rank that matters, with frigates to follow.`,
      `She has her boatswain, gunner and carpenter, a few seamen and her marines, and very little else. Before she can sail you must choose your officers, find your men, and decide what kind of captain you mean to be.`,
    ],
    options: () => [{ id: 'go', label: 'Go down to the ship', hint: '' }],
  },
  officers: {
    title: 'Your officers',
    text: (s) => [
      `Your first lieutenant is already appointed: ${officer(s, 'first').name}, thirty years at sea and no friends at the Admiralty to show for it. He will advise you, and tell you plainly when he thinks you are wrong.`,
      `The other places (the master, who navigates, and two midshipmen, the young officers in training) you may fill as you like. Captains usually filled them with men they knew.`,
    ],
    options: () => [
      { id: 'shipmates', label: 'Old shipmates', hint: 'Men you served with as a lieutenant. Loyal to you, and steady. No more than competent.' },
      { id: 'ranks', label: 'Men from the ranks', hint: 'Old hands who came up the hard way. Fine seamen, and the crew respect them. No connections, and one or two drink.' },
      { id: 'connected', label: 'Well-connected young gentlemen', hint: 'Sons and nephews of men with influence. Their families will remember you kindly. They have a lot to learn.' },
      { id: 'admiralty', label: 'Whoever the Admiralty sends', hint: 'No favours asked. You get what you get.' },
    ],
  },
  men: {
    title: 'Finding the men',
    text: (s) => [
      `${s.ship.name} needs ${complement(s)} men and has ${crewTotal(s)}. Every captain in Portsmouth is looking for seamen, and there are not enough to go round.`,
      `Volunteers come for the bounty and for a captain with a good name. The rest of the navy is filled by the press gang, which takes seafaring men by force. Pressed men work, but they did not choose to be here, and they remember it.`,
    ],
    options: () => [
      { id: 'mixed', label: 'Volunteers first, then the press for the rest', hint: 'The usual way. A full ship, about one man in five unwilling.' },
      { id: 'seamen', label: 'Volunteers only', hint: 'Willing seamen and a happier ship, but you sail about a third short of men. Costs £25 for the recruiting.' },
      { id: 'press', label: 'Send out the press gang', hint: 'A full ship by Friday. Nearly half the crew taken against their will.' },
      { id: 'landsmen', label: 'Landsmen from the inland towns', hint: 'Willing men who have never been to sea. A full, cheerful ship that cannot sail or fight well yet.' },
    ],
  },
  command: {
    title: 'What kind of captain',
    text: () => [
      `Before you sail you must read yourself in: stand on the quarterdeck and read your commission to the assembled crew. They will be watching to see what kind of captain you are.`,
      `Discipline at sea was enforced by punishment, up to and including flogging. How hard you punish, and how hard you drill the men, are the two biggest choices a captain makes. You can change both at any time later, under "How the ship is run".`,
    ],
    options: () => [
      { id: 'firm', label: 'Firm and fair', hint: 'Punishment that fits the offence. Drill at the guns and aloft in equal measure.' },
      { id: 'taut', label: 'A taut ship', hint: 'Punish hard and drill the guns hard. Order comes quickly; the men will not love you for it.' },
      { id: 'easy', label: 'An easy ship', hint: 'As little punishment as you can manage. Drill aloft, not at the guns. Popular, until it is not.' },
    ],
  },
};

function personName(rng) {
  return `Mr ${rng.pick(FORENAMES)} ${rng.pick(SURNAMES)}`;
}

/** Officer groups: master and two midshipmen are filled from the chosen source. */
const GROUPS = {
  shipmates: { competence: [48, 66], loyalty: [70, 85], faults: ['none', 'none', 'none', 'debt'], interest: 0, trust: 2 },
  ranks: { competence: [62, 82], loyalty: [55, 70], faults: ['none', 'none', 'drink', 'drink'], interest: 0, trust: 6 },
  connected: { competence: [28, 52], loyalty: [45, 60], faults: ['none', 'none', 'slack', 'debt'], interest: 9, trust: -2 },
  admiralty: { competence: [35, 75], loyalty: [35, 60], faults: ['none', 'none', 'cruel', 'drink', 'slack'], interest: 0, trust: 0 },
};

export function setupChoose(s, id) {
  const step = SETUP_STEPS[s.setup.step];
  const opts = SETUP[step].options(s).map((o) => o.id);
  if (!opts.includes(id)) throw new Error(`no option ${id} at setup step ${step}`);
  const rng = streamFor(s.seed, 0, `setup:${step}`);
  s.setup.choices[step] = id;
  const d = s.crew.drivers;
  const g = s.crew.groups;
  switch (step) {
    case 'officers': {
      const G = GROUPS[id];
      for (const o of s.officers) {
        if (o.post === 'first' || o.post === 'surgeon') continue;
        o.name = personName(rng);
        o.competence = rng.range(...G.competence) - (o.post === 'master' ? 0 : 15);
        o.loyalty = rng.range(...G.loyalty);
        o.fault = o.post === 'master' ? rng.pick(G.faults) : (rng.chance(0.25) ? rng.pick(G.faults) : 'none');
        o.origin = id;
      }
      s.player.interest = clamp(s.player.interest + G.interest);
      d.trust = clamp(d.trust + G.trust);
      log(s, `Officers appointed: ${SETUP.officers.options().find((o) => o.id === id).label.toLowerCase()}.`, 'career');
      break;
    }
    case 'men': {
      const room = () => Math.max(0, complement(s) - crewTotal(s));
      if (id === 'mixed') {
        const v = Math.round(room() * 0.55);
        g.able += Math.round(v * 0.45); g.ordinary += v - Math.round(v * 0.45);
        g.pressed += room();
      } else if (id === 'seamen') {
        const v = Math.round(room() * 0.45);
        g.able += Math.round(v * 0.5); g.ordinary += v - Math.round(v * 0.5);
        money(s, -25, 'Recruiting for volunteers');
        d.trust = clamp(d.trust + 4);
      } else if (id === 'press') {
        const v = Math.round(room() * 0.2);
        g.ordinary += v;
        g.pressed += room();
        s.crew.grievance = clamp(s.crew.grievance + 10);
      } else if (id === 'landsmen') {
        const v = Math.round(room() * 0.2);
        g.ordinary += v;
        g.landsmen += room();
        d.trust = clamp(d.trust + 3);
      }
      const base = baseSkill(s);
      s.crew.skill = { seamanship: base.seamanship, gunnery: base.gunnery };
      log(s, `The ship's company is found: ${crewTotal(s)} men of ${complement(s)}.`, 'crew');
      break;
    }
    case 'command': {
      const orders = {
        firm: { drill: 'mixed', rations: 'full', work: 'normal', discipline: 'firm' },
        taut: { drill: 'gunnery', rations: 'full', work: 'hard', discipline: 'harsh' },
        easy: { drill: 'seamanship', rations: 'full', work: 'light', discipline: 'lenient' },
      }[id];
      s.orders = { ...orders };
      if (id === 'taut') s.crew.discipline = clamp(s.crew.discipline + 8);
      if (id === 'easy') d.fairness = clamp(d.fairness + 4);
      break;
    }
    default: break;
  }
  s.setup.step++;
  return s.setup.step >= SETUP_STEPS.length;
}

export function setupView(s) {
  const step = SETUP_STEPS[s.setup.step];
  const sc = SETUP[step];
  return {
    step: s.setup.step + 1, of: SETUP_STEPS.length, id: step,
    title: sc.title, text: sc.text(s), options: sc.options(s).map((o) => ({ ...o, tags: [o.id] })),
  };
}
