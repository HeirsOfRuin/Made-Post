// Content checks: every event can be shown and answered from real states, and
// every table points at things that exist.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EVENTS, SYSTEM_EVENTS } from '../src/content/events.js';
import { ACTS, SUPERIORS, HISTORY } from '../src/data/acts.data.js';
import { ENEMIES, SHIP_CLASSES, CLASS_LADDER } from '../src/data/ships.data.js';
import { ORDER_TYPES, STATIONS } from '../src/data/orders.data.js';
import { play } from '../sim/bot.js';
import { apply, stakeLine } from '../src/engine/effects.js';
import { makeRng } from '../src/engine/rng.js';
import { dayOf } from '../src/engine/calendar.js';

test('acts and commissions point at real orders, stations, superiors and enemies', () => {
  let last = -Infinity;
  for (const act of ACTS) {
    for (const c of act.commissions) {
      assert.ok(ORDER_TYPES[c.orders], `${c.id}: orders ${c.orders}`);
      assert.ok(STATIONS[c.station], `${c.id}: station ${c.station}`);
      assert.ok(SUPERIORS[c.superior], `${c.id}: superior ${c.superior}`);
      for (const e of Object.keys(c.enemies)) assert.ok(ENEMIES[e], `${c.id}: enemy ${e}`);
      if (c.finale) assert.ok(EVENTS[c.finale], `${c.id}: finale ${c.finale}`);
      assert.ok(dayOf(c.start) > last, `${c.id} starts before the commission before it`);
      last = dayOf(c.start) + c.weeks * 7;
    }
  }
  for (const h of HISTORY) if (h.kind === 'test') assert.ok(EVENTS[h.event], `history ${h.id}: event ${h.event}`);
  for (const k of CLASS_LADDER) assert.ok(SHIP_CLASSES[k]);
});

test('Spain and the United States appear only when at war with Britain', () => {
  const spain = [['1796-10-08', '1802-03-27'], ['1804-12-12', '1808-07-04']];
  const usa = [['1812-06-18', '1815-02-17']];
  const atWar = (wars, a, b) => wars.some(([x, y]) => dayOf(a) >= dayOf(x) && b <= dayOf(y));
  for (const act of ACTS) for (const c of act.commissions) {
    const end = dayOf(c.start) + c.weeks * 7;
    if (c.enemies.spanish) assert.ok(atWar(spain, c.start, end), `${c.id} meets Spanish ships outside the wars`);
    if (c.enemies.american) assert.ok(atWar(usa, c.start, end), `${c.id} meets American ships outside the war`);
  }
});

test('every event the bots meet renders, and every option applies cleanly', () => {
  const seen = new Set();
  for (const policy of ['fair', 'harsh', 'lenient', 'lazy']) {
    for (const seed of [1, 2, 3, 4, 5, 6]) {
      play(seed, {
        policy,
        each: (s) => {
          if (s.phase !== 'decision' || !s.pending) return;
          const ev = EVENTS[s.pending.id];
          assert.ok(ev, `unknown event ${s.pending.id}`);
          seen.add(s.pending.id);
          const text = ev.text(s, s.pending.ctx);
          assert.ok(text.length > 20 && !/undefined|NaN/.test(text), `${s.pending.id} text: ${text}`);
          for (const o of ev.options(s, s.pending.ctx)) {
            assert.ok(o.tags && o.tags.length, `${s.pending.id}/${o.id} has no tags for the bot`);
            const line = stakeLine(s, o);
            assert.ok(!/undefined|NaN/.test(line), `${s.pending.id}/${o.id} stake: ${line}`);
            for (const ops of o.check ? [o.check.pass, o.check.fail] : [o.ops]) apply(structuredClone(s), ops, makeRng(1));
          }
        },
      });
    }
  }
  const systemSeen = SYSTEM_EVENTS.filter((id) => seen.has(id));
  assert.ok(systemSeen.length >= SYSTEM_EVENTS.length - 3, `system events never met in 24 careers: ${SYSTEM_EVENTS.filter((id) => !seen.has(id)).join(', ')}`);
});
