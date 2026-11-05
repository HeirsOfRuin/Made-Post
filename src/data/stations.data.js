// Distant stations a captain could ask for instead of his home orders (brief
// section 10 left the Caribbean and the East Indies out of the first version;
// Tier 3 adds them, with the Baltic).
//
// The trade-off is the historical one: distant stations made fortunes and
// killed men, and a captain out of the Admiralty's sight was slower to be
// noticed. Each row is read by career.js (the voyage), week.js (hazards) and
// battle.js (prize values, weather). Admirals by date are VERIFY items.

export const WARS = {
  // Nations Britain was at war with, by date. A sighting pool only includes a
  // nation while the war is on (asserted in test/content.test.js).
  spanish: [['1796-10-08', '1802-03-27'], ['1804-12-12', '1808-07-04']],
  american: [['1812-06-18', '1815-02-17']],
  american38: [['1812-06-18', '1815-02-17']],
  gunboats: [['1807-08-16', '1814-01-14']], // Denmark
};

export const DISTANT = {
  caribbean: {
    label: 'The Jamaica station', short: 'Jamaica',
    orders: 'cruise', station: 'jamaica', weeks: 12,
    note: 'Cruise among the islands against French and Spanish trade and the privateers of Guadeloupe. The richest hunting in the navy, and yellow fever kills more men than the enemy ever did.',
    enemies: { merchant: 4, privateer: 4, french: 1, spanish: 2 },
    prizeMult: 2, fever: 2.4, notice: 0.7, calm: 0.3,
    superiors: [['1793-01-01', 'ford'], ['1796-01-01', 'hydeparker'], ['1799-06-01', 'seymour'], ['1803-01-01', 'duckworth'], ['1805-06-01', 'dacres']],
    ask: 'Ask for the Jamaica station',
  },
  eastindies: {
    label: 'The East Indies', short: 'East Indies',
    orders: 'cruise', station: 'eastindies', weeks: 14, passage: 4,
    note: 'Four months round the Cape to Madras, then the Bay of Bengal and the French islands. East Indiamen and their cargoes are worth a fortune, and the French frigates from Mauritius are the best they have.',
    enemies: { merchant: 4, privateer: 3, french: 1 },
    prizeMult: 2.5, fever: 1, notice: 0.6, calm: 0.25,
    superiors: [['1793-01-01', 'rainier'], ['1804-09-01', 'pellewEI'], ['1809-02-01', 'drury']],
    ask: 'Ask for the East Indies',
  },
  baltic: {
    label: 'The Baltic', short: 'Baltic',
    orders: 'convoy', station: 'baltic', weeks: 10,
    note: 'Escort the timber and hemp convoys through the Sound and the Belts, where the Danish gunboats come out in every calm. The navy\'s masts depend on it.',
    enemies: { merchant: 2, privateer: 2, gunboats: 4 },
    prizeMult: 1, fever: 0, notice: 0.9, calm: 0.5,
    superiors: [['1808-01-01', 'saumarez']],
    ask: 'Ask for the Baltic',
  },
};

/** Which distant stations each home commission can be swapped for. */
export const ALTERNATIVES = {
  a2c1: ['caribbean'],
  a2c3: ['caribbean'],
  a3c1: ['caribbean', 'eastindies'],
  a3c3: ['eastindies', 'caribbean'],
  a4c1: ['baltic', 'eastindies'],
};

export const DISTANT_SUPERIORS = {
  ford: { name: 'Commodore Ford', note: 'Commands at Jamaica. Busy with the war in Saint-Domingue.', initiative: 0.3, discipline: 0 },
  hydeparker: { name: 'Sir Hyde Parker', note: 'Commander-in-chief at Jamaica. Grew rich on the station, and lets his captains do the same.', initiative: 0.4, discipline: 0 },
  seymour: { name: 'Lord Hugh Seymour', note: 'Commander-in-chief at Jamaica. Well liked; the fever will kill him in 1801.', initiative: 0.3, discipline: 0 },
  duckworth: { name: 'Sir John Duckworth', note: 'Commander-in-chief at Jamaica. Vain, energetic and keen on prize money.', initiative: 0.4, discipline: 0.3 },
  dacres: { name: 'Admiral Dacres', note: 'Commander-in-chief at Jamaica. Wants the trade protected above all.', initiative: -0.2, discipline: 0 },
  rainier: { name: 'Admiral Rainier', note: 'Commander-in-chief in the East Indies for ten years. Made a fortune and knows every captain\'s business.', initiative: 0.2, discipline: 0 },
  pellewEI: { name: 'Sir Edward Pellew', note: 'Commander-in-chief in the East Indies now. Remembers the captains who served him well.', initiative: 0.5, discipline: 0 },
  drury: { name: 'Admiral Drury', note: 'Commander-in-chief in the East Indies. Planning the attack on Mauritius.', initiative: 0.2, discipline: 0 },
  saumarez: { name: 'Sir James Saumarez', note: 'Commands in the Baltic. Careful, diplomatic, and determined the convoys get through.', initiative: -0.3, discipline: -0.3 },
};

export const DISTANT_STATIONS = {
  jamaica: 'the Caribbean',
  eastindies: 'the East Indies',
  baltic: 'the Baltic',
};
