// What waits for you in port: news of the war, letters from home and from your
// patron, word of your rival, and the consequences of earlier choices coming
// back (a prize court verdict, an old friend's fortunes). Built once on each
// arrival, from state, and kept so the port screen can show it.
//
// The author: "I also feel the narrative and the story is a bit thin." The
// story between voyages was a line in the log; now it is a set of letters.

import { yearOf, formatDay } from '../engine/calendar.js';
import { clamp } from '../engine/derive.js';
import { money, log } from '../engine/state.js';
import { BACKGROUNDS } from '../data/cast.data.js';

// ---- the rival -------------------------------------------------------------------

export const RIVAL = { name: 'Edmund Carrow', ship: 'Thalia', note: 'A lieutenant in the same ship as you in 1793, with an earl for an uncle and an eye on every prize you take.' };

/** The rival's career moves on, by his own luck, each time yours does. */
export function rivalVoyage(s, rng) {
  const r = s.rival;
  if (!r || r.status !== 'serving') return null;
  const news = [];
  if (!r.posted && (yearOf(s.day) >= 1796 || rng.chance(0.5))) { r.posted = true; news.push(`Carrow has been made post, through his uncle's interest. He has the ${RIVAL.ship}, a 32.`); }
  if (rng.chance(0.4)) { r.won++; news.push(`Carrow has taken a French ${rng.pick(['corvette', 'privateer', 'frigate'])}. The Gazette prints his letter at length.`); }
  const p = rng.range(0, 3);
  r.prizes += p;
  if (p >= 2) news.push(`They say Carrow has made £${p * 2}000 in prize money this year.`);
  if (yearOf(s.day) >= 1806 && rng.chance(0.12)) { r.status = 'dead'; news.push('Captain Edmund Carrow is dead of yellow fever in the West Indies. Whatever he was to you, he was thirty-eight.'); }
  return news.length ? news.join(' ') : null;
}

// ---- the patron's fortunes -------------------------------------------------------

// Patrons rose and fell with governments. Each change is dated; its effect
// depends on what kind of patron you have.
const PATRON_SHIFTS = [
  { date: '1798-02-14', bg: { lowerdeck: +12 }, text: { lowerdeck: 'Captain Dorne, who gave you your quarterdeck, has been made a rear-admiral. He writes that he will remember you.' } },
  { date: '1801-02-03', bg: { gentry: -18, naval: +6 }, text: { gentry: 'Pitt has resigned, and your cousin\'s friends are out of office with him. Sallow writes that he can do little for anyone now.', naval: 'Lord St Vincent is First Lord. Sir Richard Hale served with him; your name is mentioned in the right room.' } },
  { date: '1804-05-15', bg: { gentry: +15, naval: -8 }, text: { gentry: 'Pitt is back in office, and your cousin Sallow with him. He writes, warmly, for the first time in three years.', naval: 'St Vincent is out at the Admiralty and Lord Melville is in. Sir Richard Hale\'s friends are not Melville\'s.' } },
  { date: '1806-02-11', bg: { gentry: -10, naval: +6 }, text: { gentry: 'Pitt is dead. The new ministry has no use for your cousin.', naval: 'A new ministry, and St Vincent\'s friends are back in favour. Sir Richard writes that your name is known.' } },
  { date: '1808-09-01', bg: { lowerdeck: -40 }, text: { lowerdeck: 'Admiral Dorne is dead. You have lost the only man at the top of the service who knew what you came from.' } },
];

// ---- letters from home -----------------------------------------------------------

// Your sister Anne writes. Each letter comes once, when its moment arrives.
const FAMILY = [
  { id: 'first-june', when: (s) => s.act >= 1, text: (s) => (s.player.rank === 'captain' ? 'Anne writes: "Mother cried over the Gazette. Post-captain! Father would have stood a round to every man in the village."' : 'Anne writes: "Do not be cast down. Father was passed over twice, and Uncle Tom says the Admiralty forgets nobody who keeps at it."') },
  { id: 'rich', when: (s) => s.money >= 8000, text: () => 'Anne writes: "Your prize money has paid off the mortgage on the house. Mother has bought a pianoforte, which nobody can play."' },
  { id: 'mutiny', when: (s) => s.record.mutinies > 0, text: () => 'Anne writes: "There is talk in town about your ship. I have told everyone it is nonsense. Write and tell me it is."' },
  { id: 'married', when: (s) => yearOf(s.day) >= 1802, text: () => 'Anne writes that she is to marry Mr Lowther, the curate. "He is very dull and very kind, and I am happy."' },
  { id: 'nelson', when: (s) => s.day >= dayNum('1805-11-10'), text: () => 'Anne writes: "All London was in black for Lord Nelson. They say the crowds at St Paul\'s were silent for an hour."' },
  { id: 'mother', when: (s) => yearOf(s.day) >= 1810, text: () => 'A letter edged in black: your mother died in March, peacefully. Anne was with her. She asked after you to the end.' },
  { id: 'lashes', when: (s) => s.record.lashes > 1500, text: () => 'Anne writes, carefully: "Mr Lowther read in a pamphlet that some captains flog their men like dogs. I said you were not one of them. You are not, are you?"' },
];

// ---- consequences coming back ---------------------------------------------------

const LATER = {
  prizeCourt: (s, rng) => {
    if (rng.chance(0.55)) {
      const v = rng.range(800, 2400);
      money(s, v, 'Prize court: the American neutral condemned');
      return `The prize court has condemned the American ship you sent in: her cargo was French after all. Your share, £${v}, less the proctor's fees.`;
    }
    money(s, -600, 'Prize court: damages to the American owners');
    return 'The prize court has released the American ship you sent in, and her owners have sued you for damages and lost time. Your agent has paid £600, out of your own pocket.';
  },
  prowseCommand: (s) => {
    s.flags.prowseRescue = true;
    return 'A letter from Commander Abel Prowse: he has a sloop of his own, the Swift, on the Channel station. "I owe it to you, and I shall not forget it."';
  },
  prowseLost: (s) => {
    s.player.rep.men = clamp(s.player.rep.men - 8);
    return 'Word comes that Commander Prowse\'s sloop was taken by the French frigate, the day you sailed on. He is a prisoner at Verdun. The men know you were in sight.';
  },
  storesLost: (s) => {
    s.player.rep.service = clamp(s.player.rep.service - 6);
    return 'The store ships you left behind off Portugal were taken by privateers. The army went short of powder and shoes for a month, and Sir Arthur Wellesley has written to the Admiralty about it.';
  },
};

/**
 * Build the post waiting in port. Applies its own effects (money, standing)
 * and returns the letters, newest first.
 */
export function makeMail(s, rng) {
  const mail = [];
  for (const n of s.freshNews || []) mail.push({ from: 'News', text: n });
  s.freshNews = [];
  // Patron
  for (const sh of PATRON_SHIFTS) {
    const key = `patron:${sh.date}`;
    if (s.flags[key] || s.day < dayNum(sh.date)) continue;
    s.flags[key] = true;
    const d = sh.bg[s.player.background];
    if (!d) continue;
    s.patron.standing = clamp(s.patron.standing + d);
    mail.push({ from: 'Your patron', text: `${sh.text[s.player.background]} (Your patron's standing ${d > 0 ? 'rises' : 'falls'}.)` });
  }
  // Consequences due now
  const done = s.flags.commissionsDone || 0;
  s.later = (s.later || []).filter((l) => {
    if (l.due > done) return true;
    const text = LATER[l.id] ? LATER[l.id](s, rng) : null;
    if (text) mail.push({ from: 'Letters', text });
    return false;
  });
  // Rival
  const r = rivalVoyage(s, rng);
  if (r) mail.push({ from: 'Captain Carrow', text: r });
  // Family: one letter at most each time
  const f = FAMILY.find((x) => !s.flags[`family:${x.id}`] && x.when(s));
  if (f) { s.flags[`family:${f.id}`] = true; mail.push({ from: 'Home', text: f.text(s) }); }
  if (mail.length) log(s, `${mail.length} letter${mail.length > 1 ? 's' : ''} waiting in port.`, 'note');
  return mail;
}

function dayNum(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return Math.round((Date.UTC(y, m - 1, d) - Date.UTC(1793, 1, 1)) / 86400000);
}

/** People grow between voyages: officers gain experience, Prowse ages. */
export function growPeople(s, rng) {
  for (const o of s.officers) {
    if (o.status !== 'aboard') continue;
    const gain = o.post.startsWith('mid') ? rng.range(3, 7) : rng.range(0, 3);
    o.competence = Math.min(90, o.competence + gain);
  }
}

export { BACKGROUNDS, formatDay };
