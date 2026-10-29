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
