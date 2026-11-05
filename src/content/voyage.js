// Events that belong to a kind of voyage, scenes written for particular
// voyages, and the arcs of the people aboard. Merged into EVENTS by events.js.
//
// The author: "the narrative and the story is a bit thin. And the missions
// dealt repetitive, not enough events." Order events only come up on their
// own kind of voyage; set pieces are tied to one voyage and placed in a window
// of weeks; arcs fire once each, when the person's situation calls for them.

import { ENEMIES } from '../data/ships.data.js';
import { morale, manning } from '../engine/derive.js';

const man = (s, id) => s.named.find((n) => n.id === id && (n.status === 'aboard' || n.status === 'rated'));
const officerAt = (s, post) => s.officers.find((o) => o.post === post && o.status === 'aboard');
const prowse = (s) => s.officers.find((o) => o.name === 'Mr Abel Prowse' && o.status === 'aboard');
const lowest = (s) => Object.entries(s.crew.drivers).sort((a, b) => a[1] - b[1])[0][0];
const once = (s, key) => !s.flags[key];
const orders = (s, ...k) => k.includes(s.commission.orders);

// ---- order events: one kind of voyage each -------------------------------------

export const ORDER_EVENTS = {
  'fog-sortie': {
    kind: 'system', title: 'Out of the fog',
    weight: (s) => (orders(s, 'blockade') ? 2 : 0),
    text: () => 'The fog lifts at noon to show two French frigates and a dozen coasters creeping out along the shore, close under their batteries. They have been waiting for exactly this weather.',
    options: () => [
      { id: 'frigates', label: 'Go for the frigates', tags: ['bold', 'obey'], ops: [['battle', 'french']] },
      {
        id: 'shadow', label: 'Signal the squadron and keep them in sight', tags: ['fair', 'obey', 'cautious'],
        check: { skill: 'seamanship', vs: 48, label: 'Seamanship', pass: [['rep', 'service', 5], ['interest', 2], ['log', 'You kept them in sight until the squadron came up. They ran back into port.']], fail: [['rep', 'service', -3], ['log', 'They slipped away into the next bank of fog.']] },
      },
      { id: 'coasters', label: 'Fall on the coasters', tags: ['initiative', 'bold'], ops: [['depart'], ['chase', 'merchant']] },
    ],
  },
  'flagship-dinner': {
    kind: 'system', title: 'Dinner in the flagship',
    weight: (s) => (orders(s, 'blockade', 'convoy') && once(s, `dinner:${s.commission.id}`) ? 2 : 0),
    text: (s) => `The admiral invites his captains to dine in the flagship. Over the port, there is a chance to put in a word${prowse(s) ? ` for your first lieutenant, ${prowse(s).name}, who has waited twenty years for promotion` : ' for one of your officers'}.`,
    options: (s) => [
      { id: 'listen', label: 'Listen, and be agreeable', tags: ['cautious', 'cheap', 'obey'], ops: [['interest', 2], ['flag', `dinner:${s.commission.id}`]] },
      { id: 'speak', label: 'Speak up for your officer', tags: ['care', 'fair'], ops: [['interest', -2], ['loyalty', 'first', 15], ['flag', 'spokeForFirst'], ['flag', `dinner:${s.commission.id}`]] },
      { id: 'cruise', label: 'Ask for a cruise of your own', tags: ['bold', 'initiative'], ops: [['interest', -3], ['driver', 'prospects', 6], ['flag', `dinner:${s.commission.id}`]] },
    ],
  },
  straggler: {
    kind: 'system', title: 'A straggler',
    weight: (s) => (orders(s, 'convoy') ? 3 : 0),
    text: () => 'A heavy West Indiaman has sprung her foremast and is dropping astern of the convoy. By morning she will be alone, and every privateer on the coast knows it.',
    options: () => [
      { id: 'wait', label: 'Hold the whole convoy back for her', tags: ['care', 'obey', 'fair'], ops: [['weeks', 1], ['driver', 'prospects', -2]] },
      {
        id: 'tow', label: 'Take her in tow yourself', tags: ['bold'],
        check: { skill: 'seamanship', vs: 50, label: 'Seamanship', pass: [['rep', 'service', 2]], fail: [['rigging', -12], ['convoyLoss']] },
      },
      { id: 'leave', label: 'Leave her to take her chances', tags: ['cheap', 'cautious'], ops: [['convoyLoss']] },
    ],
  },
  'convoy-master': {
    kind: 'system', title: 'An insolent master',
    weight: (s) => (orders(s, 'convoy') && once(s, `master:${s.commission.id}`) ? 2 : 0),
    text: () => 'The master of the Bristol ship Mary Anne ignores your signals and crowds on sail to run ahead of the convoy for a better market. Others will follow if he gets away with it.',
    options: (s) => [
      { id: 'gun', label: 'Fire a shot across his bows', tags: ['harsh', 'obey'], ops: [['discipline', 1], ['flag', `master:${s.commission.id}`]] },
      { id: 'report', label: 'Note it for your report to the Admiralty', tags: ['fair', 'cautious'], ops: [['flag', `master:${s.commission.id}`]] },
      { id: 'let', label: 'Let him go', tags: ['cheap', 'lenient'], ops: [['convoyLoss'], ['flag', `master:${s.commission.id}`]] },
    ],
  },
  'press-at-sea': {
    kind: 'system', title: 'Seamen for the taking',
    weight: (s) => (orders(s, 'convoy', 'blockade') && manning(s) < 0.9 && once(s, `pressSea:${s.commission.id}`) ? 2 : 0),
    text: () => 'A homeward-bound merchantman passes close. Her crew are prime seamen, and captains short of men often took some out of passing ships at sea, leaving the masters to curse and complain.',
    options: (s) => [
      { id: 'press', label: 'Send a boat and press a dozen of them', tags: ['harsh', 'bold'], ops: [['men', 'pressed', 12], ['grievance', 4], ['interest', -1], ['flag', `pressSea:${s.commission.id}`]] },
      { id: 'leave', label: 'Let them go home', tags: ['fair', 'care'], ops: [['flag', `pressSea:${s.commission.id}`]] },
    ],
  },
  'neutral-ship': {
    kind: 'system', title: 'A neutral',
    weight: (s) => (orders(s, 'cruise') ? 2 : 0),
    text: () => 'An American merchant ship, bound for Bordeaux. Her papers say her cargo is American coffee; the smell of the hold and the master\'s nerves say it is French property. The prize court will decide, if you send her in, and courts can take years.',
    options: () => [
      { id: 'seize', label: 'Send her in for the prize court', tags: ['bold', 'initiative'], ops: [['men', 'ordinary', -4], ['later', 'prizeCourt', 1], ['log', 'An American merchantman sent in for the prize court to judge.']] },
      { id: 'let', label: 'Let her go on her way', tags: ['cautious', 'fair', 'obey'], ops: [] },
    ],
  },
  recapture: {
    kind: 'system', title: 'A British ship in French hands',
    weight: (s) => (orders(s, 'cruise', 'convoy') ? 1 : 0),
    text: () => 'A British brig from Jamaica, sailing under a French prize crew of a dozen men, heading for La Rochelle. Her own master and boy are still aboard, locked in the cabin.',
    options: () => [
      { id: 'retake', label: 'Retake her', tags: ['bold', 'obey', 'fair', 'care'], ops: [['prize', 'British brig, recaptured (salvage)', 2400], ['men', 'ordinary', -3], ['rep', 'public', 2]] },
      { id: 'let', label: 'Let her go', tags: ['cheap', 'cautious'], ops: [['rep', 'service', -2]] },
    ],
  },
  'dispatch-storm': {
    kind: 'system', title: 'A gale ahead',
    weight: (s) => (orders(s, 'dispatches') ? 3 : 0),
    text: () => 'A full gale dead ahead, and the dispatches in your cabin are already late in London\'s eyes.',
    options: () => [
      { id: 'heave', label: 'Heave to and ride it out', tags: ['cautious', 'care'], ops: [['weeks', 1]] },
      {
        id: 'drive', label: 'Drive her through it', tags: ['bold', 'obey'],
        check: { skill: 'seamanship', vs: 56, label: 'Seamanship', pass: [['rep', 'service', 2]], fail: [['rigging', -20], ['hull', -8], ['men', 'ordinary', -2, 'died']] },
      },
    ],
  },
  'surgeon-word': {
    kind: 'system', title: 'A word from the surgeon',
    weight: (s) => (officerAt(s, 'surgeon') && s.commission.week >= 3 && !s.flags[`surgeon:${s.commission.id}`] ? 2 : 0),
    text: (s) => {
      const doc = officerAt(s, 'surgeon');
      const say = { fairness: 'the men believe the punishment book is kept by whim', trust: 'the men do not believe you would stand by them', provisions: 'the beef is bad and the men know the purser knows it', workload: 'the men are tired to the bone; I am seeing the injuries that come of it', prospects: 'the men think this ship will never take a prize' }[lowest(s)];
      return `${doc.name} asks to see you privately, over a glass in your cabin. "The men tell a surgeon things they tell no one else, sir. ${say[0].toUpperCase()}${say.slice(1)}. ${morale(s) >= 60 ? 'It is not serious yet.' : 'I would not leave it.'}"`;
    },
    options: (s) => [
      { id: 'act', label: 'Thank him, and put it right', tags: ['care', 'fair'], ops: [['driver', lowest(s), 7], ['driver', 'trust', 2], ['loyalty', 'surgeon', 5], ['flag', `surgeon:${s.commission.id}`]] },
      { id: 'note', label: 'Thank him, and say you will consider it', tags: ['cautious', 'cheap'], ops: [['loyalty', 'surgeon', 2], ['flag', `surgeon:${s.commission.id}`]] },
      { id: 'rebuke', label: 'Tell him to mind his own department', tags: ['harsh'], ops: [['loyalty', 'surgeon', -15], ['flag', `surgeon:${s.commission.id}`]] },
    ],
  },
};

// ---- set pieces: written for one voyage, placed in a window of weeks --------------

export const SET_PIECES = {
  a2c1: [{ id: 'pellew', weeks: [3, 7] }],
  a2c2: [{ id: 'bridport-signal', weeks: [8, 9] }], // late May 1797: the second Spithead outbreak ended on 15 May
  a2c3: [{ id: 'cochrane', weeks: [4, 9] }],
  a3c1: [{ id: 'cornwallis', weeks: [5, 11] }],
  a3c2: [{ id: 'combined-fleet', weeks: [7, 7] }],
  a3c3: [{ id: 'coasting-convoy', weeks: [3, 8] }],
  a4c1: [{ id: 'army-colonel', weeks: [2, 6] }],
  a4c2: [{ id: 'baltimore-clipper', weeks: [3, 9] }],
  a4c3: [{ id: 'hundred-days', weeks: [5, 7] }],
};

export const SET_PIECE_EVENTS = {
  pellew: {
    kind: 'setpiece', title: 'Sir Edward Pellew',
    text: () => 'Topsails to windward: Sir Edward Pellew\'s frigate squadron, the most famous in the navy, chasing a French frigate toward the Penmarks. His flagship Indefatigable makes your number: join the chase.',
    options: (s) => [
      s.ship.cls === 'sloop'
        ? { id: 'join', label: 'Join the chase and help secure the prize', tags: ['bold', 'obey', 'fair'], ops: [['flag', 'pellewKnows'], ['interest', 3], ['prize', 'French frigate, taken with Pellew\'s squadron (a share for being in sight)', 2600], ['rep', 'service', 3]] }
        : { id: 'join', label: 'Join the chase', tags: ['bold', 'obey', 'fair'], ops: [['flag', 'pellewKnows'], ['interest', 3], ['battle', 'french', 'squadron']] },
      { id: 'keep', label: 'Answer that you are under Admiralty orders, and keep to your cruise', tags: ['cautious'], ops: [['rep', 'service', -2]] },
    ],
  },
  'bridport-signal': {
    kind: 'setpiece', title: 'The fleet puts to sea',
    text: () => 'The mutiny is settled: the King has pardoned the men and Parliament has raised their pay. Lord Bridport\'s fleet comes out of Spithead to take up the blockade again, and every ship is watching every other to see whose crew are still sullen.',
    options: (s) => [
      { id: 'address', label: 'Read the King\'s pardon to the crew yourself, and say plainly what it means', tags: ['fair', 'care'], ops: [['driver', 'trust', 5], ['grievance', -10]] },
      { id: 'exercise', label: 'Exercise the guns in sight of the fleet', tags: ['drill', 'bold'], ops: [['skill', 'gunnery', 3], ['rep', 'service', 2], ['store', 'powder', -3]] },
      { id: 'quiet', label: 'Say nothing; carry on as usual', tags: ['cautious', 'cheap'], ops: [['grievance', morale(s) < 50 ? 6 : 0]] },
    ],
  },
  cochrane: {
    kind: 'setpiece', title: 'Lord Cochrane',
    text: () => 'The little brig Speedy, fourteen four-pounders and fifty-four men, closes you off the Spanish coast. Her commander, Lord Cochrane, tall and red-haired, comes aboard and proposes, cheerfully, that the two of you raid the Spanish coasting ships sheltering under a battery near Barcelona tonight.',
    options: () => [
      {
        id: 'join', label: 'Go in with him', tags: ['bold', 'initiative'],
        check: { skill: 'seamanship', vs: 52, label: 'Seamanship, inshore at night', pass: [['prize', 'Spanish coasters, taken with Speedy', 6000], ['rep', 'service', 4], ['rep', 'public', 4], ['flag', 'cochraneFriend']], fail: [['hull', -10], ['men', 'ordinary', -6, 'killed'], ['flag', 'cochraneFriend']] },
      },
      { id: 'decline', label: 'Decline: you have a convoy to think of', tags: ['cautious', 'obey', 'fair'], ops: [['log', 'Cochrane went in alone, and came out with three prizes.']] },
    ],
  },
  cornwallis: {
    kind: 'setpiece', title: 'Billy Blue',
    text: (s) => `Admiral Cornwallis's flagship ranges up alongside, and the old man himself, in his blue coat, hails you through a speaking trumpet. ${s.commission.course === 'inshore' ? '"Close in, captain. That is where I want my frigates. Good."' : '"You are a long way from the Black Rocks, captain. I cannot see Brest from out here, and neither can you."'}`,
    options: (s) => s.commission.course === 'inshore'
      ? [{ id: 'thank', label: 'Touch your hat and thank him', tags: ['obey', 'fair'], ops: [['rep', 'service', 4], ['interest', 1]] }]
      : [
        { id: 'promise', label: 'Promise to stand in closer', tags: ['obey', 'fair'], ops: [['rep', 'service', -1]] },
        { id: 'explain', label: 'Explain that your ship\'s condition needs sea room', tags: ['cautious'], ops: [['rep', 'service', -3]] },
      ],
  },
  'combined-fleet': {
    kind: 'setpiece', title: 'They are coming out',
    text: () => 'October 1805. The signal from the inshore frigate: the enemy in Cadiz are bending sails and swaying up topsail yards. Thirty-three of the line are getting ready to come out. Nelson is fifty miles to the west, below the horizon, and frigates in a chain pass every signal to him.',
    options: () => [
      {
        id: 'shadow', label: 'Keep them in sight through the night, repeating signals', tags: ['obey', 'fair', 'bold'],
        check: { skill: 'seamanship', vs: 50, label: 'Seamanship', pass: [['rep', 'service', 6], ['interest', 3]], fail: [['rep', 'service', 1]] },
      },
      { id: 'carry', label: 'Carry the news to Nelson yourself, under all sail', tags: ['initiative', 'bold'], ops: [['rep', 'public', 4], ['rep', 'service', 3], ['rigging', -8]] },
    ],
  },
  'coasting-convoy': {
    kind: 'setpiece', title: 'A coasting convoy',
    text: () => 'Thirty small French coasters, wine and grain, creeping along the Biscay shore under a gun-brig and a chain of shore batteries. Taken together they are worth more than a frigate, if you can get them out from under the guns.',
    options: () => [
      {
        id: 'boats', label: 'Send in every boat at dusk', tags: ['bold', 'initiative'],
        check: { skill: 'morale', vs: 52, label: 'Your men\'s spirit', pass: [['prize', 'French coasters, cut out from under the batteries', 9000], ['rep', 'service', 4], ['driver', 'prospects', 10]], fail: [['men', 'ordinary', -9, 'killed'], ['driver', 'trust', -6]] },
      },
      { id: 'ship', label: 'Take the ship in and engage the gun-brig', tags: ['fair', 'bold', 'obey'], ops: [['hull', -8], ['prize', 'French gun-brig and four coasters', 5000]] },
      { id: 'let', label: 'Too dangerous: let them go', tags: ['cautious', 'cheap'], ops: [['driver', 'prospects', -5]] },
    ],
  },
  'army-colonel': {
    kind: 'setpiece', title: 'A colonel aboard',
    text: () => 'A colonel of infantry, a passenger for Lisbon, demands that you leave the slow store ships and run ahead with the three transports carrying his regiment. Sir Arthur Wellesley, he says, needs every bayonet. The store ships carry the army\'s shoes and powder.',
    options: () => [
      { id: 'refuse', label: 'Refuse: the whole convoy, or none', tags: ['obey', 'fair'], ops: [['flag', 'colonelSnub'], ['rep', 'service', 1]] },
      { id: 'agree', label: 'Agree, and leave the store ships with the sloop', tags: ['initiative', 'bold'], ops: [['depart'], ['weeks', -2], ['later', 'storesLost', 1]] },
    ],
  },
  'baltimore-clipper': {
    kind: 'setpiece', title: 'A Baltimore clipper',
    text: () => 'A long, low American schooner, raked masts and a single long gun, faster than anything in the Royal Navy. She has taken four British merchantmen this month and she is laughing at you from two miles to windward.',
    options: () => [
      {
        id: 'chase', label: 'Chase her, whatever it takes', tags: ['bold', 'obey'],
        check: { skill: 'seamanship', vs: 64, label: 'Seamanship', pass: [['prize', 'American privateer schooner', 5000], ['rep', 'public', 5], ['rep', 'service', 3]], fail: [['rigging', -10], ['log', 'She ran you out of sight by nightfall.']] },
      },
      { id: 'let', label: 'Let her go: nothing in the navy can catch her', tags: ['cautious', 'cheap'], ops: [] },
    ],
  },
  'hundred-days': {
    kind: 'setpiece', title: 'Dispatches for the Duke',
    text: () => 'May 1815. You carry dispatches for the Duke of Wellington\'s army in Belgium, landing at Ostend. On the quay, a staff officer tells you a great battle is expected within weeks, somewhere south of Brussels.',
    options: () => [
      { id: 'wait', label: 'Wait at Ostend for the reply, as ordered', tags: ['obey', 'fair', 'cautious'], ops: [['rep', 'service', 3]] },
      { id: 'ride', label: 'Lend the army your marines and boats to move stores up the canal', tags: ['initiative', 'care'], ops: [['rep', 'public', 5], ['rep', 'service', 2]] },
    ],
  },
};

// ---- arcs: the people aboard, once each, when their situation calls for it ------

export const ARCS = {
  'prowse-ask': {
    kind: 'arc', title: 'Mr Prowse asks',
    when: (s) => prowse(s) && s.player.rank === 'captain' && s.act >= 1 && s.commission.week >= 2,
    text: (s) => `${prowse(s).name} comes to your cabin, hat in hand, which you have never seen him do. "${30 + Math.max(0, Math.floor((s.day - 420) / 365))} years at sea, sir, and a lieutenant still. A word from you to the Admiralty, now that you have a name. I would not ask, but I am not young."${s.flags.spokeForFirst ? ' He knows you spoke for him at the admiral\'s table.' : ''}`,
    options: (s) => [
      { id: 'recommend', label: 'Write the letter: he deserves it', tags: ['care', 'fair'], ops: [['interest', s.flags.spokeForFirst ? -3 : -6], ['officer-leaves', 'first', 'promoted'], ['follower', 'Abel Prowse'], ['later', 'prowseCommand', 2], ['driver', 'trust', 3]] },
      { id: 'keep', label: 'Ask him to stay one more commission', tags: ['cautious', 'obey'], ops: [['loyalty', 'first', -15], ['flag', 'prowseWaits']] },
      { id: 'refuse', label: 'Tell him he is more use to you here', tags: ['harsh', 'cheap'], ops: [['loyalty', 'first', -35], ['flag', 'prowseBitter']] },
    ],
  },
  'prowse-bitter': {
    kind: 'arc', title: 'Your first lieutenant',
    when: (s) => prowse(s) && s.flags.prowseBitter && prowse(s).loyalty < 40,
    text: (s) => `${prowse(s).name} has taken to drink in the evenings, and the midshipmen say he talks about you. The wardroom is not a happy mess.`,
    options: () => [
      { id: 'talk', label: 'Have it out with him, privately', tags: ['fair', 'care'], ops: [['loyalty', 'first', 20], ['flag', 'prowseBitter', false]] },
      { id: 'transfer', label: 'Have him transferred at the next port', tags: ['harsh'], ops: [['officer-leaves', 'first', 'transferred'], ['driver', 'trust', -3]] },
    ],
  },
  'doyle-rise': {
    kind: 'arc', title: 'Michael Doyle',
    when: (s) => { const d = man(s, 'ringleader'); return d && d.status === 'aboard' && d.stance >= 12 && s.crew.drivers.fairness >= 65; },
    text: () => 'Michael Doyle, pressed out of a Liverpool ship and once the angriest man aboard, asks to be made a boatswain\'s mate. The men follow him, and these days he leads them your way.',
    options: () => [
      { id: 'rate', label: 'Make him a boatswain\'s mate', tags: ['fair', 'care'], ops: [['named', 'ringleader', 'rated'], ['driver', 'trust', 4], ['discipline', 3], ['log', 'Michael Doyle rated boatswain\'s mate.']] },
      { id: 'refuse', label: 'Not a man who was a ringleader', tags: ['cautious', 'harsh'], ops: [['stance', 'ringleader', -30]] },
    ],
  },
  'doyle-run': {
    kind: 'arc', title: 'Doyle\'s plan',
    when: (s) => { const d = man(s, 'ringleader'); return d && d.status === 'aboard' && d.stance <= -20 && s.crew.drivers.fairness < 40 && s.commission.orders !== 'cruise'; },
    text: () => 'The master-at-arms reports that Michael Doyle and six pressed men mean to take the jolly boat and row for the shore tonight.',
    options: () => [
      { id: 'flog', label: 'Seize them now and flog Doyle', tags: ['harsh'], ops: [['punish', 3, 4, 'ringleader'], ['discipline', 4]] },
      { id: 'irons', label: 'Put Doyle in irons for the court-martial at the next port', tags: ['fair', 'obey'], ops: [['named', 'ringleader', 'ashore'], ['grievance', -6], ['log', 'Michael Doyle sent ashore for court-martial.']] },
      { id: 'let', label: 'Double the boat guard and let it be known', tags: ['cautious', 'lenient'], ops: [['stance', 'ringleader', 10], ['discipline', -2]] },
    ],
  },
  'okafor-helm': {
    kind: 'arc', title: 'Samuel Okafor',
    when: (s) => { const o = man(s, 'landsman'); return o && o.status === 'rated' && s.act >= 2 && s.crew.skill.seamanship >= 55; },
    text: () => 'Samuel Okafor, who came aboard a landsman who had never been to sea, is now the best helmsman in the ship. The master asks for him to be made quartermaster\'s mate.',
    options: () => [
      { id: 'rate', label: 'Make him quartermaster\'s mate', tags: ['fair', 'care'], ops: [['skill', 'seamanship', 3], ['driver', 'fairness', 3], ['flag', 'okaforQM'], ['log', 'Samuel Okafor rated quartermaster\'s mate.']] },
      { id: 'later', label: 'In time', tags: ['cautious'], ops: [['stance', 'landsman', -10]] },
    ],
  },
  'hartley-clerk': {
    kind: 'arc', title: 'The sea lawyer',
    when: (s) => { const h = man(s, 'lawyer'); return h && h.status === 'aboard' && h.stance >= 30; },
    text: () => 'Joseph Hartley, who once kept a list of every unjust punishment in the ship, has had nothing to write in it for months. He offers to serve as your clerk: he can read, write, and check a purser\'s accounts.',
    options: () => [
      { id: 'clerk', label: 'Make him your clerk', tags: ['fair', 'care'], ops: [['named', 'lawyer', 'rated'], ['flag', 'honestPurser'], ['driver', 'provisions', 5], ['log', 'Joseph Hartley made captain\'s clerk.']] },
      { id: 'no', label: 'Thank him, no', tags: ['cautious'], ops: [['stance', 'lawyer', -10]] },
    ],
  },
  'crouch-old': {
    kind: 'arc', title: 'The old boatswain',
    when: (s) => man(s, 'bosun') && s.day >= 3700,
    text: () => 'Mr Crouch, your boatswain since the sloop, can no longer go aloft, and his hands shake. He will not ask to go; he has nowhere to go.',
    options: (s) => [
      { id: 'pension', label: 'Get him a place ashore and add £50 of your own', tags: ['care', 'fair'], ops: [['money', -50, 'A gift to Mr Crouch'], ['named', 'bosun', 'ashore'], ['driver', 'trust', 4], ['log', 'Mr Crouch retired ashore.']] },
      { id: 'keep', label: 'Keep him: he knows the ship', tags: ['cautious'], ops: [['discipline', -3]] },
      ...(man(s, 'captain-top') ? [{ id: 'eriksen', label: 'Retire him and make Eriksen boatswain', tags: ['bold', 'fair'], ops: [['named', 'bosun', 'ashore'], ['stance', 'captain-top', 25], ['skill', 'seamanship', 2], ['log', 'Lars Eriksen made boatswain.']] }] : []),
    ],
  },
  'prowse-rescue': {
    kind: 'arc', title: 'An old friend in trouble',
    when: (s) => s.flags.prowseRescue && !s.flags.prowseRescued,
    text: () => 'A British sloop running hard toward you with a French frigate on her quarter. Her number comes up in the signal book: the sloop is Commander Abel Prowse\'s.',
    options: () => [
      { id: 'help', label: 'Go to his help', tags: ['bold', 'care', 'fair', 'obey'], ops: [['flag', 'prowseRescued'], ['rep', 'public', 3], ['battle', 'french', 'friend']] },
      { id: 'leave', label: 'Your orders come first', tags: ['cautious'], ops: [['flag', 'prowseRescued'], ['later', 'prowseLost', 1]] },
    ],
  },
};

export const ARC_IDS = Object.keys(ARCS);
export { ENEMIES };
