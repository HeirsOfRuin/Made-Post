// The four acts and their commissions (brief sections 4 and 10). The calendar
// runs week by week during a commission and jumps to the next one's start date
// between them; dates in between are "unremarked service" and news.
//
// enemies: weights for what a sighting turns out to be. Spain was at war with
// Britain from October 1796 to 1802 and from December 1804 to 1808; the United
// States from June 1812 to early 1815. Pools respect those dates.

export const ACTS = [
  {
    id: 1, title: 'First Command', years: '1793-1794',
    intro: 'Your first ship, a small sloop. Learn the job, take a prize or two, and earn promotion to captain.',
    commissions: [
      {
        id: 'a1', start: '1794-04-06', weeks: 8, orders: 'cruise', station: 'channel',
        superior: 'howe', enemies: { merchant: 3, privateer: 4 }, tutorial: true,
        finale: 'glorious-first',
        note: 'The Channel Fleet is waiting for a great French grain convoy coming from America. Until it is found, you are free to hunt French shipping in the Channel.',
      },
    ],
  },
  {
    id: 2, title: 'Made Post', years: '1795-1801',
    intro: 'Captain of a frigate: a fast, well-armed ship that scouts for the fleet and hunts on her own. In 1797 the fleet\'s own sailors rise against the Admiralty, and every captain finds out what his crew really think of him.',
    commissions: [
      {
        id: 'a2c1', start: '1795-06-07', weeks: 10, orders: 'cruise', station: 'approaches',
        superior: 'bridport', enemies: { merchant: 4, privateer: 3, french: 1 },
        note: 'Hunt French ships at the mouth of the Channel, on your own. What you capture, you share in.',
      },
      {
        id: 'a2c2', start: '1797-03-26', weeks: 11, orders: 'blockade', station: 'brest',
        superior: 'bridport', enemies: { merchant: 2, privateer: 2, french: 2, spanish: 1 },
        note: 'Watch the French fleet in Brest, close in to the coast. The sailors of the Channel Fleet have not had a pay rise since 1653, and they are talking about it.',
      },
      {
        id: 'a2c3', start: '1800-10-05', weeks: 12, orders: 'convoy', station: 'med',
        superior: 'keith', enemies: { merchant: 2, privateer: 4, french: 1, spanish: 2 },
        note: 'Guard a fleet of merchant ships to the Mediterranean. Privateers will hunt for stragglers; losing one counts against you.',
      },
    ],
    ending: 'amiens',
  },
  {
    id: 3, title: 'The Long Blockade', years: '1803-1807',
    intro: 'The war is back, and it is a war of waiting: months on end off the French ports in all weathers, keeping the men healthy and sane until the enemy comes out.',
    commissions: [
      {
        id: 'a3c1', start: '1803-06-12', weeks: 15, orders: 'blockade', station: 'brest',
        superior: 'cornwallis', enemies: { merchant: 3, privateer: 2, french: 2 },
        note: 'Keep the French fleet bottled up in Brest. Admiral Cornwallis expects his ships to stay on station whatever the weather.',
      },
      {
        id: 'a3c2', start: '1805-08-25', weeks: 8, orders: 'blockade', station: 'cadiz',
        superior: 'collingwood', enemies: { merchant: 2, french: 2, spanish: 2 },
        finale: 'trafalgar',
        note: 'The French and Spanish fleets are in Cadiz. Watch them, and tell the admiral the moment they come out.',
      },
      {
        id: 'a3c3', start: '1807-03-08', weeks: 10, orders: 'cruise', station: 'biscay',
        superior: 'stvincent', enemies: { merchant: 5, privateer: 3, french: 1, spanish: 1 },
        note: 'Raid the small ships that carry France\'s coastal trade in the Bay of Biscay.',
      },
    ],
    ending: 'continental',
  },
  {
    id: 4, title: 'The Last War', years: '1808-1815',
    intro: 'You are a senior captain now. Britain rules the sea and the army is fighting in Spain and Portugal. Then in 1812 the United States declares war, and its big new frigates start beating British ones.',
    commissions: [
      {
        id: 'a4c1', start: '1809-04-16', weeks: 10, orders: 'convoy', station: 'lisbon',
        superior: 'berkeley', enemies: { merchant: 2, privateer: 4, french: 2 },
        note: 'Guard the supply ships carrying men and stores to Wellington\'s army in Portugal.',
      },
      {
        id: 'a4c2', start: '1812-10-04', weeks: 12, orders: 'cruise', station: 'northatlantic',
        superior: 'warren', enemies: { merchant: 4, privateer: 3, american: 1 },
        note: 'Hunt American merchant ships off Newfoundland. The Admiralty has ordered frigates not to fight the big American 44-gun ships alone.',
      },
      {
        id: 'a4c3', start: '1815-03-26', weeks: 12, orders: 'dispatches', station: 'channel',
        superior: 'keith', enemies: { merchant: 2, privateer: 3, french: 2 },
        note: 'Napoleon has escaped from exile and the war is on again. Carry urgent dispatches; every day you spend chasing makes them later.',
      },
    ],
    ending: 'peace',
  },
];

// Historical news and tests, fired once when the clock passes their date
// (at sea, or on reaching port for anything passed in the gap). kind 'news'
// only logs and nudges; kind 'test' becomes a decision (events.data.js).
export const HISTORY = [
  { id: 'lemon', date: '1795-04-01', kind: 'news', text: 'The Admiralty orders lemon juice issued to the fleet. Scurvy, the old killer, can be held off at sea.', flag: 'lemonJuice' },
  { id: 'spain-war', date: '1796-10-08', kind: 'news', text: 'Spain declares war on Britain. Spanish ships and specie are now fair prize.' },
  { id: 'st-vincent', date: '1797-02-14', kind: 'news', text: 'Jervis beats the Spanish off Cape St Vincent. Nelson wore out of the line without orders and was praised for it.' },
  { id: 'spithead', date: '1797-04-16', kind: 'test', event: 'hist-spithead', text: 'The Channel Fleet at Spithead refuses to sail until the men\'s pay and food are improved.' },
  { id: 'nore', date: '1797-05-12', kind: 'test', event: 'hist-nore', text: 'Mutiny at the Nore. Unlike Spithead, it turns ugly.' },
  { id: 'hermione', date: '1797-11-20', kind: 'news', text: 'News from the West Indies: in September the crew of HMS Hermione murdered Captain Pigot and most of his officers and handed the ship to the Spanish. Pigot had threatened to flog the last men down from the rigging; two fell to their deaths hurrying, and he had their bodies thrown overboard.', flag: 'hermione' },
  { id: 'camperdown', date: '1797-10-11', kind: 'news', text: 'Duncan beats the Dutch at Camperdown. Many of his crews had been at the Nore in May.' },
  { id: 'nile', date: '1798-08-01', kind: 'news', text: 'Nelson destroys the French fleet in Aboukir Bay. The Nile.' },
  { id: 'copenhagen', date: '1801-04-02', kind: 'news', text: 'Copenhagen. Nelson ignores Parker\'s signal to leave off action, and wins.' },
  { id: 'st-vincent-lord', date: '1801-02-19', kind: 'news', text: 'Lord St Vincent is First Lord of the Admiralty. He is hard on slackness and harder on corruption in the dockyards.', flag: 'stVincentFirstLord' },
  { id: 'war-resumes', date: '1803-05-18', kind: 'news', text: 'War with France resumes. Ships are commissioned in a hurry; the press is hot.' },
  { id: 'emperor', date: '1804-12-02', kind: 'news', text: 'Napoleon crowns himself Emperor. An army waits at Boulogne for the Channel to be clear.' },
  { id: 'spain-war-2', date: '1804-12-12', kind: 'news', text: 'Spain is at war with Britain again.' },
  { id: 'continental', date: '1806-11-21', kind: 'news', text: 'The Berlin Decree: Napoleon closes the ports of Europe to British trade.' },
  { id: 'prize-reform', date: '1808-06-01', kind: 'news', text: 'A new proclamation on prize money: captains\' shares are cut from three eighths to two, and more goes to the lower deck.', flag: 'prizeReform' },
  { id: 'spain-ally', date: '1808-07-04', kind: 'news', text: 'Spain rises against Napoleon and is now an ally.' },
  { id: 'us-war', date: '1812-06-18', kind: 'news', text: 'The United States declares war.' },
  { id: 'guerriere', date: '1812-08-19', kind: 'news', text: 'The American 44 Constitution has taken HMS Guerriere. The country is shocked; the service is worse.', flag: 'guerriere' },
  { id: 'macedonian', date: '1812-10-25', kind: 'news', text: 'The United States has taken HMS Macedonian. Two British frigates beaten in single-ship actions.' },
  { id: 'java', date: '1812-12-29', kind: 'news', text: 'HMS Java taken by the Constitution. Three in a year.' },
  { id: 'shannon', date: '1813-06-01', kind: 'news', text: 'Captain Broke\'s Shannon takes the Chesapeake off Boston in about fifteen minutes. Broke had drilled his gun crews for seven years, partly at his own expense.', flag: 'shannon' },
  { id: 'abdication', date: '1814-04-06', kind: 'news', text: 'Napoleon abdicates and is sent to Elba.' },
  { id: 'hundred-days', date: '1815-03-01', kind: 'news', text: 'Napoleon has landed in France. The Hundred Days begin.' },
  { id: 'waterloo', date: '1815-06-18', kind: 'news', text: 'Waterloo. The war is over.' },
];

// Superior officers by commission. 'initiative' scales how a departure from
// orders is judged (positive: rewarded if it pays); 'discipline' scales how
// the punishment record is read (positive: severity is approved, negative:
// it is counted against you).
export const SUPERIORS = {
  howe:        { name: 'Lord Howe', note: 'Commands the Channel Fleet. Careful and methodical.', initiative: 0, discipline: 0 },
  bridport:    { name: 'Lord Bridport', note: 'Commands the Channel Fleet. Cautious; likes orders followed.', initiative: -0.5, discipline: 0 },
  keith:       { name: 'Lord Keith', note: 'A generous admiral who backs captains who get results.', initiative: 0.3, discipline: 0 },
  cornwallis:  { name: 'Admiral Cornwallis', note: 'Expects you to stay at your post whatever happens. Leaving it to chase a prize will not please him.', initiative: -0.8, discipline: 0.3 },
  collingwood: { name: 'Lord Collingwood', note: 'Famous for rarely flogging. He will read your punishment record, and judge you by it.', initiative: 0.2, discipline: -1 },
  berkeley:    { name: 'Admiral Berkeley', note: 'Commands at Lisbon. Cares most that the army\'s supplies arrive.', initiative: -0.4, discipline: 0 },
  warren:      { name: 'Admiral Warren', note: 'Short of ships in North America and glad of any captain who gets results.', initiative: 0.5, discipline: 0 },
  stvincent:   { name: 'Lord St Vincent', note: 'Commands the Channel Fleet. Strict, and hard on slack ships.', initiative: 0.2, discipline: 1 },
};
