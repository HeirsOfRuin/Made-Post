// Order types (brief section 5 and 6.5). Each row is read by the engine:
// sighting odds, what the order does to the men's prospects, whether a flag
// officer shares prize money, and what "departing from orders" means.

export const ORDER_TYPES = {
  convoy: {
    label: 'Convoy escort',
    brief: 'Guard a group of merchant ships to their port. Losing one counts against you.',
    sighting: 0.3, prospects: -0.4, flagShare: true,
    initiative: 'Leave the convoy to chase',
    duty: 'convoy',
  },
  blockade: {
    label: 'Blockade station',
    brief: 'Stay off an enemy port and report anything that comes out. Long, dull weeks; the men lose heart.',
    sighting: 0.16, prospects: -1.6, flagShare: true,
    initiative: 'Leave the station to chase',
    duty: 'station',
  },
  cruise: {
    label: 'Independent cruise',
    brief: 'Hunt enemy ships on your own. Captured ships are sold and you share the money: the best posting there is.',
    sighting: 0.42, prospects: +0.8, flagShare: false,
    initiative: null,
    duty: null,
  },
  dispatches: {
    label: 'Dispatches',
    brief: 'Carry urgent letters as fast as you can. Chasing anything makes them late.',
    sighting: 0.22, prospects: -0.2, flagShare: true,
    initiative: 'Turn aside to chase',
    duty: 'speed',
  },
};

export const STATIONS = {
  channel: 'the Channel',
  approaches: 'the Western Approaches',
  brest: 'off Brest',
  biscay: 'the Bay of Biscay',
  med: 'the Mediterranean',
  cadiz: 'off Cadiz',
  lisbon: 'the Lisbon run',
  northatlantic: 'the North Atlantic',
  northsea: 'the North Sea',
};

// Where to sail, chosen week by week on a cruise or a blockade (convoys and
// dispatches follow a fixed route). Each row is read by week.js and battle.js:
// how often you sight anything, what you sight, how dangerous gales are, and
// what a merchant prize is worth.
export const COURSES = {
  inshore: {
    label: 'Inshore',
    hint: { cruise: 'Close along the enemy coast: plenty of small, cheap coasting ships and few warships, but rocks and shoals wear the ship down. Boats can raid the harbours.', blockade: 'Close in to the harbour mouth: you see everything that moves, and so does the admiral. Dangerous in a gale.' },
    sighting: 1.3, pool: { merchant: 2, privateer: 1.2, french: 0.4, spanish: 0.4, american: 0.4 }, gale: 10, prizeValue: 0.5, raid: true, admiral: 0.3, shoal: 0.2,
  },
  patrol: {
    label: 'Patrol',
    hint: { cruise: 'The trade routes: a fair mix of merchant ships, privateers and the odd warship.', blockade: 'Your appointed station: neither close nor far.' },
    sighting: 1, pool: {}, gale: 0, prizeValue: 1, raid: false, admiral: 0, shoal: 0,
  },
  offshore: {
    label: 'Offshore',
    hint: { cruise: 'Far out on the ocean routes: fewer ships, but the merchants are rich, and enemy frigates are more common. Safe from the coast.', blockade: 'Well out to sea: safe in a gale, but things slip past you, and the admiral notices.' },
    sighting: 0.85, pool: { merchant: 1, french: 1.6, spanish: 1.6, american: 1.6 }, gale: -8, prizeValue: 2.4, raid: false, admiral: -0.4, shoal: 0,
  },
};
export const COURSE_ORDERS = ['cruise', 'blockade'];
