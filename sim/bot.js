// The reference bot. It plays through the facade only (newGame, choose, view),
// so it plays the same game a person does. Each policy answers EVERY decision
// explicitly by tag preference; a decision none of its tags covers falls back
// to the first option and is counted (record.fallbacks), so a policy that is
// silently not making choices shows up in the batch report (F13).

import { newGame, choose, view } from '../src/engine/game.js';

export const POLICIES = {
  fair: {
    sea: { course: 'patrol', plan: (v) => (v.crew.drivers.workload < 35 ? 'rest' : null) },
    setup: { officers: 'shipmates', men: 'mixed', command: 'firm' },
    orders: { drill: 'mixed', rations: 'full', work: 'normal', discipline: 'firm' },
    prefer: ['fair', 'care', 'obey', 'bold', 'drill', 'cautious', 'cheap'],
    port: { press: 0.8, volunteers: true, quota: true, powder: 1, liberty: true, recommend: true },
  },
  harsh: {
    sea: { course: 'inshore', plan: () => 'raid' },
    setup: { officers: 'admiralty', men: 'press', command: 'taut' },
    orders: { drill: 'mixed', rations: 'full', work: 'hard', discipline: 'harsh' },
    prefer: ['harsh', 'obey', 'bold', 'drill', 'cheap', 'cautious'],
    port: { press: 1, volunteers: true, quota: true, powder: 1, liberty: false, recommend: false },
  },
  // Harsh standing orders, fair answers to every case: isolates the punishment order itself.
  strict: {
    sea: { course: 'patrol', plan: () => null },
    setup: { officers: 'shipmates', men: 'mixed', command: 'taut' },
    orders: { drill: 'mixed', rations: 'full', work: 'normal', discipline: 'harsh' },
    prefer: ['fair', 'care', 'obey', 'bold', 'drill', 'cautious', 'cheap'],
    port: { press: 0.8, volunteers: true, quota: true, powder: 1, liberty: true, recommend: true },
  },
  lenient: {
    sea: { course: 'patrol', plan: (v) => (v.crew.drivers.workload < 45 ? 'rest' : null) },
    setup: { officers: 'connected', men: 'seamen', command: 'easy' },
    orders: { drill: 'seamanship', rations: 'full', work: 'light', discipline: 'lenient' },
    prefer: ['lenient', 'care', 'fair', 'bold', 'obey', 'cheap', 'cautious'],
    port: { press: 0.6, volunteers: true, quota: true, powder: 0, liberty: true, recommend: true },
  },
  drilled: {
    sea: { course: 'offshore', plan: () => null },
    setup: { officers: 'ranks', men: 'mixed', command: 'firm' },
    orders: { drill: 'gunnery', rations: 'full', work: 'normal', discipline: 'firm' },
    prefer: ['drill', 'fair', 'bold', 'care', 'obey', 'cautious', 'cheap'],
    port: { press: 0.8, volunteers: true, quota: true, powder: 3, liberty: true, recommend: true },
  },
  lazy: {
    sea: { course: 'patrol', plan: () => null },
    setup: { officers: 'admiralty', men: 'mixed', command: 'easy' },
    orders: { drill: 'none', rations: 'full', work: 'light', discipline: 'firm' },
    prefer: ['cheap', 'fair', 'obey', 'bold', 'cautious'],
    port: { press: 0.8, volunteers: true, quota: true, powder: 0, liberty: true, recommend: false },
  },
};

// Every tag an option can carry. A policy's own order comes first; the rest
// follow in this order, so every decision is answered by a stated rule.
export const ALL_TAGS = ['fair', 'care', 'obey', 'bold', 'drill', 'cautious', 'cheap', 'initiative', 'lenient', 'harsh'];

export function pick(options, prefer, counter) {
  const order = [...prefer, ...ALL_TAGS.filter((t) => !prefer.includes(t))];
  for (const tag of order) {
    const o = options.find((x) => (x.tags || []).includes(tag) && !x.locked);
    if (o) return o.id;
  }
  if (counter) counter.n++;
  return options[0].id;
}

/** Play one whole career. opts.policy names a policy or passes one; opts.override changes orders. */
export function play(seed, opts = {}) {
  const pol = typeof opts.policy === 'object' ? opts.policy : POLICIES[opts.policy || 'fair'];
  const orders = { ...pol.orders, ...(opts.orders || {}) };
  let s = newGame({ seed, background: opts.background || 'naval' });
  if (opts.setup) opts.setup(s); // tests and the inert check adjust the opening state here
  const fallbacks = { n: 0 };
  const trace = opts.trace ? [] : null;
  let steps = 0;
  const MAX = 4000;
  while (s.phase !== 'ended' && steps++ < MAX) {
    for (const [k, v] of Object.entries(orders)) if (s.orders[k] !== v) s = choose(s, { type: 'orders', key: k, value: v });
    const v = view(s);
    let input;
    switch (s.phase) {
      case 'setup': input = { type: 'setup', id: (opts.setupChoices || pol.setup || {})[v.setup.id] || v.setup.options[0].id }; break;
      case 'port': input = { type: 'port', id: portMove(v, pol.port, s) }; break;
      case 'sea': {
        // Where to sail, then at most one action, then the week.
        const want = (opts.sea || pol.sea || {});
        const course = opts.course || want.course;
        if (v.sea.courses && course && v.sea.course !== course) { input = { type: 'course', id: course }; break; }
        const plan = want.plan ? want.plan(v) : null;
        const a = plan && v.sea.actions.find((x) => x.id === plan && !x.locked);
        if (a && v.sea.plan !== a.id) { input = { type: 'plan', id: a.id }; break; }
        input = { type: 'advance' };
        break;
      }
      case 'decision': input = { type: 'option', id: pick(v.decision.options, pol.prefer, fallbacks) }; break;
      case 'battle': input = { type: 'battle', id: v.battle.phase === 'done' ? 'continue' : pick(v.battle.options, pol.prefer, fallbacks) }; break;
      case 'report': input = { type: 'report' }; break;
      case 'interlude': input = { type: 'interlude', id: pick(v.interlude.options, pol.prefer, fallbacks) }; break;
      default: throw new Error(`bot has no move for phase ${s.phase}`);
    }
    if (trace) trace.push(`${v.date} ${s.phase} ${JSON.stringify(input)}`);
    s = choose(s, input);
    if (opts.each) opts.each(s);
  }
  s.botSteps = steps;
  s.record.fallbacks = fallbacks.n;
  if (trace) s.trace = trace;
  return s;
}

function portMove(v, port, s) {
  const can = (id) => v.port.actions.find((a) => a.id === id && !a.locked);
  const manned = v.crew.total / v.crew.complement;
  if (port.volunteers && can('volunteers')) return 'volunteers';
  if (manned < port.press && can('press')) return 'press';
  if (port.quota && manned < 0.95 && can('quota')) return 'quota';
  if ((s.port.done.powder || 0) < port.powder && can('powder') && v.captain.money > 200) return 'powder';
  if (port.liberty && can('liberty')) return 'liberty';
  if (port.recommend && can('recommend')) return 'recommend';
  if (can('sail')) return 'sail';
  if (can('press')) return 'press';
  if (can('quota')) return 'quota';
  throw new Error(`bot stuck in port: ${v.port.actions.find((a) => a.id === 'sail').locked}`);
}
