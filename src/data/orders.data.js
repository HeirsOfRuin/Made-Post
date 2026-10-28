// Order types (brief section 5 and 6.5). Each row is read by the engine:
// sighting odds, what the order does to the men's prospects, whether a flag
// officer shares prize money, and what "departing from orders" means.

export const ORDER_TYPES = {
  convoy: {
    label: 'Convoy escort',
    brief: 'See the convoy safe to its port. Losing a merchantman under your protection is answered for.',
    sighting: 0.3, prospects: -0.4, flagShare: true,
    initiative: 'Leave the convoy to chase',
    duty: 'convoy',
  },
  blockade: {
    label: 'Blockade station',
    brief: 'Hold your station off the enemy coast and report what moves. Weeks of nothing, then sudden action.',
    sighting: 0.16, prospects: -1.6, flagShare: true,
    initiative: 'Leave the station to chase',
    duty: 'station',
  },
  cruise: {
    label: 'Independent cruise',
    brief: 'Cruise against the enemy\'s trade. The prize-money posting; no admiral takes an eighth.',
    sighting: 0.42, prospects: +0.8, flagShare: false,
    initiative: null,
    duty: null,
  },
  dispatches: {
    label: 'Dispatches',
    brief: 'Carry dispatches with all speed. Every day spent chasing is a day the dispatches are late.',
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
