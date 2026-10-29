// Every standing order, background, opening choice and ship trait must change the game (rule 2:
// nothing declared is decoration). With a deterministic engine an ignored knob
// gives a byte-identical career, so this is exact, not statistical.
// Ship traits only colour the first ship here (later ships draw their own), and
// some act only in gales or chases, so they get more seeds: "crank" changed
// 7 of 30 careers when first measured, so 4 seeds could miss it.
// Usage: node sim/inert.js   (exits 1 if anything is inert)

import { inertCheck } from './inert-check.js';
import { play } from './bot.js';
import { SHIP_TRAITS } from '../src/data/ships.data.js';

const run = (seed, cfg) => play(seed, {
  policy: 'fair',
  background: cfg.background,
  setupChoices: { officers: cfg.officers, men: cfg.men, command: cfg.command },
  sea: cfg.sea ? { course: cfg.sea.course, plan: () => cfg.sea.plan } : undefined,
  orders: { drill: cfg.drill, rations: cfg.rations, work: cfg.work, discipline: cfg.discipline },
  setup: (s) => { s.ship.trait = cfg.trait; },
});
// The career and the ship's condition, minus the trait's own name.
const digest = (s) => JSON.stringify({ r: s.record, m: s.money, p: s.player, d: s.day, c: s.crew, h: s.ship && [s.ship.hull, s.ship.rigging, s.ship.stores] });
const base = { drill: 'mixed', rations: 'full', work: 'normal', discipline: 'firm', background: 'naval', trait: null, officers: 'shipmates', men: 'mixed', command: 'firm', sea: null };
const knob = (name, values) => Object.fromEntries(Object.keys(base).map((k) => [k, { default: base[k], try: k === name ? values : [] }]));

const orders = inertCheck({
  play: run, digest, seeds: [1, 2, 3],
  knobs: {
    ...knob('none', []),
    drill: { default: 'mixed', try: ['none', 'seamanship', 'gunnery'] },
    rations: { default: 'full', try: ['short'] },
    work: { default: 'normal', try: ['light', 'hard'] },
    discipline: { default: 'firm', try: ['lenient', 'harsh'] },
    background: { default: 'naval', try: ['gentry', 'lowerdeck'] },
    officers: { default: 'shipmates', try: ['ranks', 'connected', 'admiralty'] },
    men: { default: 'mixed', try: ['seamen', 'press', 'landsmen'] },
    command: { default: 'firm', try: ['taut', 'easy'] },
    sea: { default: null, try: [{ course: 'inshore', plan: null }, { course: 'offshore', plan: null }, { course: 'patrol', plan: 'rest' }, { course: 'inshore', plan: 'raid' }, { course: 'patrol', plan: 'home' }] },
  },
});
const traits = inertCheck({ play: run, digest, seeds: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], knobs: knob('trait', Object.keys(SHIP_TRAITS)) });
console.log(orders.text.split('\n').filter((l) => l.trim() && !/^\d+ inert/.test(l)).join('\n'));
console.log(traits.text.split('\n').filter((l) => l.trim() && !/^\d+ inert/.test(l)).join('\n'));
const inert = [...orders.inert, ...traits.inert];
console.log(`\n${inert.length} inert${inert.length ? `: ${inert.join(', ')}` : ''}`);
process.exit(inert.length ? 1 : 0);
