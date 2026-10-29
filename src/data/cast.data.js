// Backgrounds, the invented cast and the named men (brief sections 3, 6.1, 6.3, 7).

export const BACKGROUNDS = {
  naval: {
    label: 'Naval family',
    blurb: 'Your father was a captain. Admirals know your name; your purse is thin.',
    interest: 40, money: 300, seamanship: 55, gunnery: 45, trustBonus: 0, patron: 'Admiral Sir Richard Hale, your father\'s old first lieutenant',
  },
  gentry: {
    label: 'Gentry younger son',
    blurb: 'A gentleman\'s younger son, with an allowance and a cousin in Parliament.',
    interest: 28, money: 1500, seamanship: 48, gunnery: 45, trustBonus: 0, patron: 'Mr Edward Sallow MP, your cousin',
  },
  lowerdeck: {
    label: 'Up from the lower deck',
    blurb: 'Pressed into the navy at sixteen, you worked your way up from ordinary sailor. Nobody important knows you. The men know you know the work.',
    interest: 8, money: 60, seamanship: 70, gunnery: 52, trustBonus: 15, patron: 'Captain William Dorne, who gave you your quarterdeck',
  },
};

// Officers: competence, loyalty and a fault the engine reads (officers.js).
export const OFFICER_SLOTS = [
  { post: 'first', label: 'First lieutenant' },
  { post: 'master', label: 'Master' },
  { post: 'surgeon', label: 'Surgeon' },
  { post: 'mid1', label: 'Midshipman' },
  { post: 'mid2', label: 'Midshipman' },
];

export const FAULTS = {
  none:    { label: 'Steady', note: '' },
  cruel:   { label: 'Cruel', note: 'Starts the men with a rope\'s end on his own account. Fairness suffers unless you curb him.' },
  drink:   { label: 'Drinks', note: 'Unreliable in the night watches. Raises the risk of a grounding or a lost spar.' },
  debt:    { label: 'In debt', note: 'Owes money ashore. May ask you for a loan, or sell the ship\'s stores.' },
  slack:   { label: 'Slack', note: 'Lets things slide. Discipline drifts down under him.' },
};

// The first lieutenant of Act 1 is the teacher: seasoned, blunt, steady.
export const TEACHER = { name: 'Mr Abel Prowse', post: 'first', competence: 72, loyalty: 60, ambition: 30, fault: 'none', age: 46,
  note: 'Thirty years at sea and no interest. He will tell you when you are wrong.' };

export const SURNAMES = ['Harker', 'Tolley', 'Garrow', 'Penhale', 'Wyatt', 'Searle', 'Mowbray', 'Fenwick', 'Cheyne', 'Ludlow',
  'Raikes', 'Treloar', 'Ashby', 'Quiller', 'Danvers', 'Bellamy', 'Pryor', 'Haddon', 'Kitto', 'Strode', 'Venn', 'Ormsby'];
export const FORENAMES = ['John', 'William', 'Thomas', 'James', 'George', 'Henry', 'Edward', 'Robert', 'Richard', 'Samuel', 'Charles', 'Francis'];

// The named men. Each has a role the engine reads: the ringleader carries
// mutiny forward, the sea lawyer turns unfairness into petitions, the
// promising landsman can be made a topman (and later a petty officer).
// Origins are varied on purpose (brief rule 7): crews were mixed.
export const NAMED_MEN = [
  { id: 'bosun', role: 'boatswain', name: 'Mr Daniel Crouch', origin: 'Deptford', note: 'Thirty years in the service. Runs the deck.' },
  { id: 'gunner', role: 'gunner', name: 'Mr Isaac Penrose', origin: 'Falmouth', note: 'Keeps the powder and resents wasting it.' },
  { id: 'ringleader', role: 'ringleader', name: 'Michael Doyle', origin: 'Wexford', note: 'Pressed out of a Liverpool merchantman. Able, angry and listened to.' },
  { id: 'lawyer', role: 'sea lawyer', name: 'Joseph Hartley', origin: 'Bristol', note: 'Can recite the Articles of War and the pay regulations. Makes trouble about both.' },
  { id: 'landsman', role: 'promising landsman', name: 'Samuel Okafor', origin: 'Deptford, by way of Jamaica', note: 'A free Black Londoner, a waterman before the press took him. Quick aloft.' },
  { id: 'captain-top', role: 'captain of the foretop', name: 'Lars Eriksen', origin: 'Bergen', note: 'A Norwegian volunteer. The best seaman aboard and he knows it.' },
];

export const GROUPS = {
  able: { label: 'Able seamen', note: 'Skilled. Valued. Will desert if badly treated.' },
  ordinary: { label: 'Ordinary seamen', note: 'Some skill. The core of the crew.' },
  landsmen: { label: 'Landsmen', note: 'Unskilled. Need training.' },
  pressed: { label: 'Pressed men', note: 'Unwilling. High desertion and mutiny risk at first. Can be won over.' },
  marines: { label: 'Marines', note: 'Soldiers aboard. Keep order and fight at close quarters.' },
};
// Skill each group brings to the crew's base seamanship and gunnery.
export const GROUP_SKILL = { able: 75, ordinary: 50, landsmen: 15, pressed: 30, marines: 30 };
