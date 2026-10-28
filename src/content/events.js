// Events. Rule 4 of the brief: events come from systems. Each system event has
// a weight computed from state (0 = cannot happen now), so what turns up says
// something true about the ship. Only the tutorial lessons, the historical
// tests and the act finales are hand-placed.
//
// Shape: { id, kind, weight(s, ctx)?, prepare(s, rng)?, title, text(s, ctx),
//          options(s, ctx) -> [{ id, label, tags, ops? , check? }] }
// tags are read by the reference bot (sim/bot.js) to answer every decision.

import { ORDER_TYPES, STATIONS } from '../data/orders.data.js';
import { ENEMIES, SHIP_CLASSES, SHIP_TRAITS } from '../data/ships.data.js';
import { SUPERIORS } from '../data/acts.data.js';
import { FAULTS } from '../data/cast.data.js';
import { SEVERITY, OFFENCES } from '../engine/effects.js';
import { morale, lemonJuice, ANARCHY, crewTotal } from '../engine/derive.js';

/** Our weight of metal and men against hers, before skill (the same ratio battle.js reports). */
export function sizeAgainst(s, kind) {
  const e = ENEMIES[kind];
  return (SHIP_CLASSES[s.ship.cls].broadside * crewTotal(s)) / (e.broadside * e.crew);
}

const man = (s, id) => s.named.find((n) => n.id === id && n.status === 'aboard');
const short = (m) => m.name.replace(/^Mr /, '').split(' ').slice(-1)[0];
const officerWith = (s, fault) => s.officers.find((o) => o.status === 'aboard' && o.fault === fault && !o.curbed);
const firstLt = (s) => s.officers.find((o) => o.post === 'first' && o.status === 'aboard');
const lowestDriver = (s) => Object.entries(s.crew.drivers).sort((a, b) => a[1] - b[1])[0][0];

/** The punishment ladder as options, for any case brought before the captain. */
function punishOptions(gravity, who, extra = []) {
  return [0, 1, 2, 3, 4].map((sev) => ({
    id: `sev${sev}`,
    label: SEVERITY[sev],
    tags: [sev === Math.round(gravity) ? 'fair' : sev > gravity ? 'harsh' : 'lenient', `sev${sev}`],
    ops: [['punish', gravity, sev, who], ...extra],
  }));
}

export const EVENTS = {
  // ---- Act 1 lessons (the teacher speaks) ------------------------------------
  'tut-watches': {
    kind: 'tutorial', title: 'Watches and divisions',
    text: (s) => `${firstLt(s)?.name || 'Your first lieutenant'} brings you the watch bill. "Two watches, sir, watch and watch, and they'll learn the ship faster. Three, and they'll sleep, and like you better for it. Pressed men are slow to like anyone."`,
    options: () => [
      { id: 'three', label: 'Three watches: let them sleep', tags: ['fair', 'care'], ops: [['driver', 'workload', 8], ['driver', 'trust', 2]] },
      { id: 'two', label: 'Watch and watch: work them up', tags: ['drill', 'harsh'], ops: [['driver', 'workload', -6], ['skill', 'seamanship', 4]] },
    ],
  },
  'tut-punish': {
    kind: 'tutorial', title: 'Your first punishment',
    text: (s) => {
      const m = man(s, 'ringleader');
      return `${m ? m.name : 'A pressed man'} is brought aft: drunk at his station and insolent to the boatswain's mate. The whole ship is watching to see what kind of captain you are. "The Articles allow you a dozen without a court, sir," says ${firstLt(s)?.name || 'the first lieutenant'}. "Most give more. The men will remember which."`;
    },
    options: () => punishOptions(2, 'ringleader'),
  },
  'tut-powder': {
    kind: 'tutorial', title: 'Powder and practice',
    text: (s) => `${man(s, 'gunner')?.name || 'The gunner'} protests: the Admiralty allows powder for practice once a month, and you mean to fire the guns every week. "That's your own money after the allowance, sir." Captain Broke of the Shannon would later spend years of his own income doing exactly this.`,
    options: () => [
      { id: 'live', label: 'Fire them with powder, at my expense', tags: ['drill'], ops: [['money', -40, 'Powder for gun practice'], ['skill', 'gunnery', 6], ['store', 'powder', -6]] },
      { id: 'dumb', label: 'Run them in and out without firing', tags: ['cheap', 'cautious'], ops: [['skill', 'gunnery', 2]] },
    ],
  },
  'tut-orders': {
    kind: 'tutorial', title: 'Orders or initiative',
    text: (s) => `A signal from the flagship: all cruisers to rejoin by Sunday. At the same moment the masthead hails a sail to the south, a Frenchman by her cut. "You have discretion, sir," ${firstLt(s)?.name || 'the first lieutenant'} says, "until you don't. Lord Howe likes his signals obeyed."`,
    options: () => [
      { id: 'obey', label: 'Obey the signal and rejoin', tags: ['obey', 'cautious'], ops: [['rep', 'service', 3], ['driver', 'prospects', -3]] },
      { id: 'chase', label: 'Chase, and explain afterwards', tags: ['initiative', 'bold'], ops: [['depart'], ['chase', 'merchant']] },
    ],
  },
  'tut-action': {
    kind: 'tutorial', title: 'A privateer',
    text: () => 'A French privateer brig has taken a Guernsey coaster under your lee and is putting a prize crew into her. She has fourteen guns to your sixteen, and more men. Your first action.',
    options: () => [
      { id: 'engage', label: 'Engage her', tags: ['bold', 'obey', 'fair'], ops: [['battle', 'privateer']] },
      { id: 'shadow', label: 'Shadow her and wait for support', tags: ['cautious'], ops: [['rep', 'service', -4], ['driver', 'trust', -5], ['convoyLoss']] },
    ],
  },

  // ---- Act finales -------------------------------------------------------------
  'glorious-first': {
    kind: 'finale', title: 'The Glorious First of June',
    text: () => 'Lord Howe has brought the French fleet to battle four hundred miles out in the Atlantic. Your sloop has no place in the line. You are ordered to repeat the admiral\'s signals down the fleet, through the smoke.',
    options: () => [
      {
        id: 'repeat', label: 'Hold your station and repeat every signal', tags: ['obey', 'cautious', 'fair'],
        check: { skill: 'seamanship', vs: 45, label: 'Keeping station in the smoke', pass: [['rep', 'service', 10], ['interest', 4]], fail: [['rep', 'service', 3]] },
      },
      {
        id: 'rescue', label: 'Close a dismasted French seventy-four to take off the drowning', tags: ['care', 'bold', 'initiative'],
        check: { skill: 'seamanship', vs: 55, label: 'Working in under her guns', pass: [['rep', 'service', 8], ['rep', 'public', 10], ['driver', 'trust', 8]], fail: [['hull', -20], ['men', 'ordinary', -6, 'killed'], ['rep', 'service', 2]] },
      },
      {
        id: 'tow', label: 'Take a crippled British ship in tow', tags: ['initiative', 'bold'],
        check: { skill: 'seamanship', vs: 60, label: 'Passing a tow in action', pass: [['rep', 'service', 14], ['interest', 6]], fail: [['rigging', -25], ['rep', 'service', -2]] },
      },
    ],
  },
  trafalgar: {
    kind: 'finale', title: 'Trafalgar',
    text: () => '21 October 1805. The Combined Fleet is out of Cadiz and Nelson\'s two columns are bearing down on its centre. Frigates do not lie in the line; yours repeats signals, tows and picks up the survivors when it is done.',
    options: () => [
      {
        id: 'signals', label: 'Repeat signals for Collingwood\'s column', tags: ['obey', 'cautious', 'fair'],
        check: { skill: 'seamanship', vs: 50, label: 'Station-keeping', pass: [['rep', 'service', 8], ['interest', 4]], fail: [['rep', 'service', 2]] },
      },
      {
        id: 'tow', label: 'Tow a dismasted prize clear before the gale', tags: ['initiative', 'bold'],
        check: { skill: 'seamanship', vs: 62, label: 'Towing in a rising gale', pass: [['rep', 'service', 12], ['rep', 'public', 6], ['interest', 5]], fail: [['rigging', -30], ['hull', -10], ['rep', 'service', -2]] },
      },
      {
        id: 'survivors', label: 'Pick up survivors from the burning Achille', tags: ['care'],
        ops: [['rep', 'public', 8], ['driver', 'trust', 6], ['rep', 'service', 4]],
      },
    ],
  },

  // ---- History as a test -------------------------------------------------------
  'hist-spithead': {
    kind: 'history', title: 'Spithead',
    text: (s) => `Word has come out from Spithead: the Channel Fleet will not weigh until the men's pay, unchanged since 1653, is raised and their food made honest. A boat from a ship of the line comes alongside asking your people to send delegates. Your crew's mood: ${morale(s) >= 55 ? 'loyal, but they want the pay' : 'sullen, and listening'}.`,
    options: () => [
      { id: 'allow', label: 'Let them send delegates; forward their petition yourself', tags: ['fair', 'care'], ops: [['grievance', -15], ['driver', 'trust', 6], ['driver', 'fairness', 4], ['rep', 'service', -2]] },
      {
        id: 'forbid', label: 'Forbid it and keep the men at work', tags: ['harsh', 'obey'],
        check: { skill: 'morale', vs: 52, label: 'Whether they stay with you', pass: [['discipline', 6], ['rep', 'service', 4]], fail: [['stage', 1], ['driver', 'trust', -8]] },
      },
    ],
  },
  'hist-nore': {
    kind: 'history', title: 'The Nore',
    text: () => 'The mutiny at the Nore has gone further than Spithead: ships blockading the Thames, a delegate called President Parker, officers sent ashore. It will end with Parker hanged. Your men have heard all of it.',
    options: () => [
      { id: 'articles', label: 'Read the Articles of War to the ship\'s company', tags: ['harsh', 'obey'], ops: [['discipline', 5], ['driver', 'trust', -2]] },
      { id: 'talk', label: 'Speak plainly to them about pay and what you can do', tags: ['fair', 'care'], ops: [['driver', 'trust', 4], ['grievance', -8]] },
    ],
  },

  // ---- Mutiny ladder: each warning sign is a decision --------------------------
  'mut-1': {
    kind: 'mutiny', title: 'Muttering',
    text: (s) => `The men go quiet when officers pass, and a hammock was cut down in the night. "There's talk on the lower deck, sir," says ${firstLt(s)?.name || 'the first lieutenant'}. "${{ fairness: 'They think punishment here is a lottery', trust: 'They don\'t trust the quarterdeck', provisions: 'It\'s the food', workload: 'They\'re worked to death', prospects: 'They say she\'s a dead ship' }[lowestDriver(s)]}."`,
    options: (s) => [
      { id: 'address', label: `Deal with the cause (${lowestDriver(s)})`, tags: ['fair', 'care'], ops: [['driver', lowestDriver(s), 10], ['grievance', -10], ['discipline', -2]] },
      { id: 'grog', label: 'Splice the main brace', tags: ['lenient'], ops: [['driver', 'provisions', 5], ['grievance', -5], ['discipline', -3], ['store', 'food', -1]] },
      { id: 'example', label: 'Flog the loudest as an example', tags: ['harsh'], ops: [['punish', 1, 3, 'ringleader'], ['grievance', 4]] },
      { id: 'ignore', label: 'Ignore it', tags: ['cheap'], ops: [['grievance', 5]] },
    ],
  },
  'mut-2': {
    kind: 'mutiny', title: 'A round robin',
    text: (s) => `A petition is found on the capstan, the names signed in a circle so that no man signed first. ${man(s, 'lawyer') ? `It reads like ${man(s, 'lawyer').name}'s work.` : ''} It complains of ${lowestDriver(s)}, and it is respectful, so far.`,
    options: (s) => [
      { id: 'answer', label: 'Read it to the ship and answer it', tags: ['fair', 'care'], ops: [['driver', lowestDriver(s), 14], ['grievance', -18], ['discipline', -3], ['driver', 'trust', 4]] },
      { id: 'forward', label: 'Forward it to the admiral', tags: ['obey', 'cautious'], ops: [['grievance', -10], ['rep', 'service', -2]] },
      { id: 'flog', label: 'Find the author and flog him', tags: ['harsh'], ops: [['punish', 1, 4, 'lawyer'], ['grievance', 10], ['discipline', 6]] },
      { id: 'ignore', label: 'Ignore it', tags: ['cheap'], ops: [['grievance', 9]] },
    ],
  },
  'mut-3': {
    kind: 'mutiny', title: 'Refusing duty',
    text: (s) => `The hands will not turn out. They are not violent; they stand on the forecastle and say they will work when ${lowestDriver(s) === 'provisions' ? 'the food is fit to eat' : lowestDriver(s) === 'fairness' ? 'the punishments stop' : lowestDriver(s) === 'workload' ? 'they have had rest' : 'they are treated fairly'}. The marines are under arms.`,
    options: () => [
      {
        id: 'speak', label: 'Go forward alone and speak to them', tags: ['fair', 'bold'],
        check: { skill: 'trust', vs: 48, label: 'Whether they trust you', pass: [['grievance', -25], ['driver', 'trust', 6]], fail: [['grievance', 10], ['driver', 'trust', -4]] },
      },
      { id: 'concede', label: 'Concede their demand', tags: ['lenient', 'care'], ops: [['driver', 'fairness', 8], ['driver', 'provisions', 8], ['driver', 'workload', 8], ['grievance', -30], ['discipline', -10], ['rep', 'service', -4]] },
      {
        id: 'arrest', label: 'Send in the marines and arrest the leaders', tags: ['harsh'],
        check: { skill: 'discipline', vs: 45, label: 'Whether the marines hold', pass: [['discipline', 10], ['driver', 'fairness', -8], ['grievance', -12], ['named', 'ringleader', 'ashore']], fail: [['mutiny', 'outbreak']] },
      },
    ],
  },
  'mut-4': {
    kind: 'mutiny', title: 'Mutiny',
    text: (s) => `At two bells in the middle watch the hands rise. The officers are held in the gunroom. ${man(s, 'ringleader') ? `${man(s, 'ringleader').name} speaks for them.` : ''} What happens now depends on what they think of you.`,
    options: () => [
      {
        id: 'parley', label: 'Parley: hear their terms', tags: ['fair', 'care'],
        check: { skill: 'fairness', vs: 40, label: 'Whether they think you just', pass: [['mutiny', 'strike']], fail: [['mutiny', 'violent']] },
      },
      {
        id: 'fight', label: 'Rally the officers and marines', tags: ['harsh', 'bold'],
        check: { skill: 'discipline', vs: 55, label: 'Whether the marines stand', pass: [['mutiny', 'suppressed']], fail: [['mutiny', 'violent']] },
      },
    ],
  },

  // ---- Sightings ---------------------------------------------------------------
  sighting: {
    kind: 'sighting', title: 'Sail ho',
    text: (s, ctx) => {
      const e = ENEMIES[ctx.enemy];
      if (!e.fights) return `A ${e.flag} ${e.name}, deep-laden, to leeward. A prize, if you can catch her.`;
      if (ctx.enemy === 'privateer' && s.commission.orders === 'convoy') return `A ${e.flag} privateer is hanging on the convoy's rear, waiting for a straggler.`;
      if (ctx.enemy === 'privateer') return `A ${e.flag} privateer brig, fast and well manned. Worth taking, if you can catch her.`;
      const r = sizeAgainst(s, ctx.enemy);
      return `A ${e.flag} ${e.name}, standing toward you under easy sail. She has seen you. ${ctx.enemy === 'american' ? 'She is bigger than any British frigate, and her guns are 24-pounders. ' : ''}${r < 0.75 ? 'She is the heavier ship by a distance.' : r > 1.3 ? 'You are the heavier ship.' : 'You are fairly matched in size.'} (Her broadside ${e.broadside} lb and ${e.crew} men; yours ${SHIP_CLASSES[s.ship.cls].broadside} lb and ${crewTotal(s)}.)`;
    },
    options: (s, ctx) => {
      const o = ORDER_TYPES[s.commission.orders];
      const e = ENEMIES[ctx.enemy];
      const defend = ctx.enemy === 'privateer' && o.duty === 'convoy';
      const away = o.initiative && !defend && !(e.fights && ctx.enemy !== 'privateer');
      if (e.fights && ctx.enemy !== 'privateer') {
        // Against a clearly heavier ship, avoiding action is what the service
        // expected (after 1812 the Admiralty ordered frigates not to engage the
        // American 44s alone), so the tags say so.
        const heavier = sizeAgainst(s, ctx.enemy) < 0.75;
        return [
          { id: 'engage', label: 'Clear for action', tags: heavier ? ['bold'] : ['bold', 'obey'], ops: [['battle', ctx.enemy]] },
          {
            id: 'avoid', label: 'Avoid action', tags: heavier ? ['cautious', 'obey', 'fair'] : ['cautious'],
            check: { skill: 'seamanship', vs: e.seamanship - 5, label: 'Getting clear', pass: [['rep', 'service', -2]], fail: [['battle', ctx.enemy]] },
          },
        ];
      }
      if (defend) {
        return [
          { id: 'drive', label: 'Drive her off the convoy', tags: ['obey', 'bold'], ops: [['battle', ctx.enemy]] },
          { id: 'close', label: 'Close up the convoy and keep station', tags: ['cautious'], ops: [['convoyLoss']] },
        ];
      }
      return [
        { id: 'chase', label: away ? `${o.initiative}` : 'Chase', tags: away ? ['initiative', 'bold'] : ['bold', 'obey'], ops: away ? [['depart'], ['chase', ctx.enemy]] : [['chase', ctx.enemy]] },
        { id: 'let', label: 'Let her go', tags: away ? ['obey', 'cautious'] : ['cautious'], ops: [['driver', 'prospects', -2]] },
      ];
    },
  },

  // ---- System events -----------------------------------------------------------
  gale: {
    kind: 'system', title: 'A gale',
    weight: (s) => (s.commission.orders === 'blockade' ? 3 : 2),
    text: (s) => `It comes on to blow from the south-west, hard, with a lee shore under you${s.ship.trait === 'crank' ? ', and she is crank: she lies over until the lee guns are in the water' : ''}.`,
    options: (s) => {
      const crank = SHIP_TRAITS[s.ship.trait]?.gale || 0;
      return [
        {
          id: 'shorten', label: 'Shorten sail early and claw off', tags: ['cautious', 'fair'],
          check: { skill: 'seamanship', vs: 38 + crank, label: 'Seamanship', pass: [['rigging', -3]], fail: [['rigging', -12], ['hull', -5]] },
        },
        {
          id: 'carry', label: 'Carry sail and hold the station', tags: ['bold', 'obey'],
          check: { skill: 'seamanship', vs: 58 + crank, label: 'Seamanship', pass: [['rep', 'service', 2], ['driver', 'trust', 3]], fail: [['rigging', -22], ['hull', -10], ['men', 'ordinary', -3, 'died']] },
        },
      ];
    },
  },
  sickness: {
    kind: 'system', title: 'The sick list',
    weight: (s) => (s.crew.health < 72 ? 4 : 0),
    text: (s) => {
      const surgeon = s.officers.find((o) => o.post === 'surgeon' && o.status === 'aboard');
      const scurvy = s.crew.weeksSinceFresh > 8 && !lemonJuice(s);
      return `${surgeon ? surgeon.name : 'The surgeon'} brings the sick list: ${scurvy ? 'scurvy, swollen gums and old wounds opening' : 'fevers and fluxes, the ship close and wet below'}. He wants fresh food and dry bedding, and he wants them now.`;
    },
    options: () => [
      { id: 'buy', label: 'Buy fresh food from a passing vessel, at my expense', tags: ['care', 'fair'], ops: [['money', -45, 'Fresh food for the sick'], ['health', 10], ['driver', 'trust', 3], ['driver', 'provisions', 4]] },
      { id: 'rest', label: 'Ease the work and air the ship', tags: ['care', 'cheap'], ops: [['health', 5], ['driver', 'workload', 4], ['skill', 'seamanship', -2]] },
      { id: 'carry', label: 'Carry on', tags: ['harsh', 'cheap'], ops: [['health', -4], ['driver', 'trust', -3]] },
    ],
  },
  'cruel-officer': {
    kind: 'system', title: 'The rope\'s end',
    weight: (s) => (officerWith(s, 'cruel') ? 4 : 0),
    prepare: (s) => ({ post: officerWith(s, 'cruel').post }),
    text: (s, ctx) => {
      const o = s.officers.find((x) => x.post === ctx.post);
      return `${o.name}, your ${o.label.toLowerCase()}, has the boatswain's mates starting the men with rope's ends for being slow, on his own authority. ${FAULTS.cruel.note}`;
    },
    options: (s, ctx) => [
      { id: 'curb', label: 'Order him to stop: no man struck without your word', tags: ['fair'], ops: [['curb', ctx.post], ['loyalty', ctx.post, -12], ['driver', 'fairness', 5]] },
      { id: 'back', label: 'Back your officer', tags: ['harsh'], ops: [['loyalty', ctx.post, 6], ['discipline', 3], ['driver', 'fairness', -5]] },
    ],
  },
  'drunk-officer': {
    kind: 'system', title: 'Drink in the middle watch',
    weight: (s) => (officerWith(s, 'drink') ? 3 : 0),
    prepare: (s) => ({ post: officerWith(s, 'drink').post }),
    text: (s, ctx) => {
      const o = s.officers.find((x) => x.post === ctx.post);
      return `${o.name} was drunk on deck in the middle watch and nearly had the topsails aback. The watch saw it.`;
    },
    options: (s, ctx) => [
      { id: 'warn', label: 'Warn him privately; stop his wine', tags: ['fair', 'care'], ops: [['curb', ctx.post], ['loyalty', ctx.post, -5]] },
      { id: 'public', label: 'Reprimand him on the quarterdeck', tags: ['harsh'], ops: [['curb', ctx.post], ['loyalty', ctx.post, -15], ['driver', 'fairness', 4], ['discipline', 2]] },
      { id: 'ignore', label: 'Let it pass', tags: ['lenient', 'cheap'], ops: [['driver', 'fairness', -4], ['discipline', -2]] },
    ],
  },
  'debt-officer': {
    kind: 'system', title: 'A loan',
    weight: (s) => (officerWith(s, 'debt') ? 2 : 0),
    prepare: (s) => ({ post: officerWith(s, 'debt').post }),
    text: (s, ctx) => {
      const o = s.officers.find((x) => x.post === ctx.post);
      return `${o.name} asks to speak privately. His creditors ashore have written to his family. He needs fifty pounds.`;
    },
    options: (s, ctx) => [
      { id: 'lend', label: 'Lend it', tags: ['care'], ops: [['money', -50, 'Loan to an officer'], ['loyalty', ctx.post, 18], ['curb', ctx.post]] },
      { id: 'refuse', label: 'Refuse', tags: ['cheap', 'cautious'], ops: [['loyalty', ctx.post, -10]] },
    ],
  },
  'named-case': {
    kind: 'system', title: 'Defaulters',
    weight: (s) => (['ringleader', 'lawyer', 'captain-top'].some((id) => man(s, id)) ? 2 + (s.crew.discipline < 45 ? 2 : 0) : 0),
    prepare: (s, rng) => {
      const who = rng.pick(['ringleader', 'lawyer', 'captain-top'].filter((id) => man(s, id)));
      const offence = rng.weighted(OFFENCES);
      return { who, offence: offence.id };
    },
    text: (s, ctx) => {
      const m = man(s, ctx.who);
      const o = OFFENCES.find((x) => x.id === ctx.offence);
      return `${m.name}, ${m.role}, is brought aft for ${o.label}. The ship knows him, and knows how you dealt with the last man.`;
    },
    options: (s, ctx) => punishOptions(OFFENCES.find((x) => x.id === ctx.offence).gravity, ctx.who),
  },
  'purser-weights': {
    kind: 'system', title: 'Short weight',
    weight: (s) => (man(s, 'lawyer') && s.crew.drivers.provisions < 60 ? 3 : 0),
    text: (s) => `${man(s, 'lawyer').name} has weighed the beef. The purser's pound is fourteen ounces, as it always is in the service, and he says so loudly, citing the regulations.`,
    options: () => [
      { id: 'inquire', label: 'Inquire into the purser\'s weights', tags: ['fair', 'care'], ops: [['driver', 'provisions', 6], ['driver', 'fairness', 4], ['stance', 'lawyer', 10]] },
      { id: 'dismiss', label: 'Tell him it is the custom of the service', tags: ['cautious', 'cheap'], ops: [['driver', 'fairness', -4], ['stance', 'lawyer', -8]] },
      { id: 'flog', label: 'Flog him for insolence', tags: ['harsh'], ops: [['punish', 0.5, 3, 'lawyer'], ['grievance', 5]] },
    ],
  },
  'landsman-rated': {
    kind: 'system', title: 'A promising landsman',
    weight: (s) => (man(s, 'landsman') && s.crew.skill.seamanship > 45 ? 2 : 0),
    text: (s) => `${man(s, 'landsman').name} went aloft to clear a fouled sheet in a squall when two able seamen hung back. The captain of the foretop wants him in his top.`,
    options: () => [
      { id: 'rate', label: 'Rate him able and put him in the foretop', tags: ['fair', 'care'], ops: [['named', 'landsman', 'rated'], ['men', 'landsmen', -1], ['men', 'able', 1], ['driver', 'fairness', 3], ['driver', 'trust', 2]] },
      { id: 'wait', label: 'Not yet', tags: ['cautious'], ops: [['stance', 'landsman', -6]] },
    ],
  },
  boredom: {
    kind: 'system', title: 'Dead weeks',
    weight: (s) => (s.commission.orders === 'blockade' && s.crew.drivers.prospects < 45 ? 4 : 0),
    text: () => 'Week after week of the same grey water, the same headland, the same reef in and reef out. Nothing comes out. The men are dull and quarrelsome.',
    options: () => [
      { id: 'theatre', label: 'Allow theatricals and a fiddler on the forecastle', tags: ['care', 'lenient'], ops: [['driver', 'prospects', 6], ['driver', 'workload', 3], ['discipline', -1]] },
      { id: 'exercise', label: 'Great-gun exercise against a towed target', tags: ['drill'], ops: [['skill', 'gunnery', 3], ['store', 'powder', -3], ['driver', 'prospects', 2], ['driver', 'workload', -2]] },
      { id: 'work', label: 'Keep them busy: holystone the decks', tags: ['harsh', 'cheap'], ops: [['discipline', 2], ['driver', 'workload', -4]] },
    ],
  },
  'fresh-food': {
    kind: 'system', title: 'Fresh beef',
    weight: (s) => (s.crew.weeksSinceFresh > 5 && s.commission.orders !== 'cruise' ? 3 : 0),
    text: (s) => `A victualler has come out to the ${s.commission.orders === 'blockade' ? 'squadron' : 'convoy'} with live bullocks and onions. There is a scramble among the captains for them.`,
    options: () => [
      { id: 'buy', label: 'Pay the victualler\'s master to favour you', tags: ['care'], ops: [['money', -30, 'Fresh provisions'], ['driver', 'provisions', 8], ['flag', 'freshFood'], ['health', 4]] },
      { id: 'share', label: 'Take your turn', tags: ['cheap', 'fair'], ops: [['driver', 'provisions', 3]] },
    ],
  },
  'desert-risk': {
    kind: 'system', title: 'Boats to the shore',
    weight: (s) => (s.commission.orders !== 'cruise' && morale(s) < 45 && s.crew.groups.pressed + s.crew.groups.able > 20 ? 3 : 0),
    text: () => 'The boats are needed inshore for water. A boat\'s crew close to a friendly coast, with the ship unhappy, is a boat\'s crew that may not come back.',
    options: (s) => [
      { id: 'marines', label: 'Send marines in every boat', tags: ['harsh', 'cautious'], ops: [['driver', 'trust', -3], ['driver', 'fairness', -2]] },
      {
        id: 'trust', label: 'Send them as usual', tags: ['fair'],
        check: { skill: 'trust', vs: 45, label: 'Whether they come back', pass: [['driver', 'trust', 3]], fail: [['men', 'pressed', -Math.min(6, s.crew.groups.pressed), 'deserted'], ['men', 'able', -3, 'deserted']] },
      },
    ],
  },
  'anarchy': {
    kind: 'system', title: 'A slack ship',
    weight: (s) => (s.crew.discipline < ANARCHY ? 6 : 0),
    text: () => 'Drink has got into the ship. Two men were found asleep at the masthead, the cable tier stinks, and a midshipman was laughed at on the forecastle. A slack ship goes to pieces in a gale, or in action.',
    options: () => [
      { id: 'tighten', label: 'Tighten up: stop the grog of the whole watch', tags: ['fair', 'harsh'], ops: [['discipline', 8], ['driver', 'provisions', -6]] },
      { id: 'flog', label: 'Flog the worst offenders, a dozen apiece', tags: ['harsh'], ops: [['punish', 1.5, 3], ['punish', 1.5, 3], ['punish', 1.5, 3], ['discipline', 6]] },
      { id: 'ignore', label: 'Let the officers deal with it', tags: ['lenient', 'cheap'], ops: [['discipline', -3]] },
    ],
  },
  'eriksen': {
    kind: 'system', title: 'The captain of the foretop',
    weight: (s) => (man(s, 'captain-top') && s.crew.drivers.fairness > 50 ? 1 : 0),
    text: (s) => `${man(s, 'captain-top').name} asks to be rated quartermaster. He is the best seaman aboard and the men follow him. He is also a foreigner, and the boatswain says it will cause talk.`,
    options: () => [
      { id: 'rate', label: 'Rate him quartermaster', tags: ['fair', 'care'], ops: [['stance', 'captain-top', 15], ['skill', 'seamanship', 3], ['driver', 'fairness', 2], ['stance', 'bosun', -6]] },
      { id: 'refuse', label: 'Refuse', tags: ['cautious'], ops: [['stance', 'captain-top', -15], ['driver', 'fairness', -2]] },
    ],
  },
};

export const SYSTEM_EVENTS = Object.entries(EVENTS).filter(([, e]) => e.kind === 'system').map(([id]) => id);

export const TUTORIAL_WEEKS = { 1: 'tut-watches', 2: 'tut-punish', 3: 'tut-powder', 5: 'tut-orders', 6: 'tut-action' };

export const STATION_NAME = (s) => STATIONS[s.commission.station];
export const SUPERIOR = (s) => SUPERIORS[s.commission.superior];
