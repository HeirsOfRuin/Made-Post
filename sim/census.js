// Content reach: how often each event, set piece and arc reaches a player,
// letters per career, and how often a week brings a card.
// Usage: node sim/census.js [policy=fair]
// How often each new piece of content actually reaches a player (fair bot, 100 careers).
import { play } from './bot.js';
import { EVENTS } from '../src/content/events.js';
import { SET_PIECES, ARCS } from '../src/content/voyage.js';
const seen = {}; let letters = 0, careers = 100, cards = 0, weeks = 0;
const mailKinds = {};
for (let i = 0; i < careers; i++) {
  const got = new Set(); let lastPort = null, lastTurn = null;
  const s = play(1 + i * 7919, { policy: process.argv[2] || 'fair', each: (x) => {
    if (x.phase === 'decision' && x.pending) { got.add(x.pending.id); if (x.turn !== lastTurn) { cards++; lastTurn = x.turn; } }
    if (x.phase === 'port' && x.port && x.day !== lastPort && x.port.mail) { lastPort = x.day; letters += x.port.mail.length; for (const m of x.port.mail) mailKinds[m.from] = (mailKinds[m.from] || 0) + 1; }
  } });
  weeks += s.record.weeksAtSea;
  for (const id of got) seen[id] = (seen[id] || 0) + 1;
}
const kinds = ['setpiece', 'arc', 'system'];
for (const k of kinds) {
  console.log(`\n${k}:`);
  for (const [id, e] of Object.entries(EVENTS)) if (e.kind === k) console.log(`  ${id.padEnd(18)} in ${seen[id] || 0}% of careers`);
}
console.log(`\nletters per career ${(letters / careers).toFixed(1)}`, mailKinds, `\nweeks with a card ${(100 * cards / weeks).toFixed(0)}%`);
