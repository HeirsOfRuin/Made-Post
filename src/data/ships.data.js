// Ship classes and enemy types. Numbers are first-draft approximations from the
// standard reference ranges (Gardiner, Winfield); every row is marked VERIFY in
// docs/DESIGN.md until checked. Broadside is the weight of shot in pounds fired
// by one side, which is what the resolver compares; tons is burthen, which scales
// how much shot a hull can take.

export const SHIP_CLASSES = {
  sloop: {
    name: 'ship-sloop', rate: 'sloop', guns: 16, gunLabel: '16 x 6-pounders',
    broadside: 48, tons: 365, complement: 121, speed: 62,
    stores: { food: 16, water: 10, powder: 40 },
  },
  frigate32: {
    name: '32-gun frigate', rate: 'fifth rate', guns: 32, gunLabel: '26 x 12-pdr, 6 x 6-pdr',
    broadside: 170, tons: 700, complement: 220, speed: 60,
    stores: { food: 20, water: 12, powder: 70 },
  },
  frigate38: {
    name: '38-gun frigate', rate: 'fifth rate', guns: 38, gunLabel: '28 x 18-pdr, 10 x 9-pdr',
    broadside: 300, tons: 1000, complement: 284, speed: 64,
    stores: { food: 22, water: 13, powder: 90 },
  },
  frigate40: {
    name: '40-gun heavy frigate', rate: 'fifth rate', guns: 40, gunLabel: '26 x 24-pdr, 14 x 32-pdr carronades',
    broadside: 420, tons: 1270, complement: 340, speed: 61,
    stores: { food: 22, water: 13, powder: 110 },
  },
};

// The order a career moves through. The Admiralty offers the best class your
// posting score reaches (see career.js).
export const CLASS_LADDER = ['sloop', 'frigate32', 'frigate38', 'frigate40'];

export const SHIP_NAMES = {
  sloop: ['Kestrel', 'Hazard', 'Speedwell', 'Merlin', 'Alacrity'],
  frigate32: ['Thetis', 'Southampton', 'Aeolus', 'Pallas', 'Cerberus'],
  frigate38: ['Andromache', 'Phoebe', 'Naiad', 'Amethyst', 'Seahorse'],
  frigate40: ['Endymion', 'Indefatigable', 'Leander', 'Majestic', 'Acasta'],
};

// A ship's character, drawn once when she is assigned. Each one is read by
// the engine (asserted by sim/inert.js), not just shown.
export const SHIP_TRAITS = {
  fast:    { label: 'Fast', note: 'Gains in a chase.', speed: +8 },
  wet:     { label: 'Wet', note: 'Ships green seas; the men are seldom dry. Health suffers and never quite recovers.', health: -0.6, healthCap: 88 },
  crank:   { label: 'Crank', note: 'Heels badly under sail: she cannot carry sail in a breeze, is harder to handle in a gale, and hard driving strains her.', speed: -4, gale: 8, strain: 1.25 },
  lucky:   { label: 'Lucky', note: 'The men believe in her. Prospects hold up.', prospects: +0.6 },
  illfame: { label: 'Bad name', note: 'Her last captain was hated. The men start wary, and old stories keep trust down.', trust: -12, trustDrift: -0.6 },
};

export const ENEMIES = {
  merchant: {
    name: 'merchantman', flag: 'French', broadside: 12, tons: 300, crew: 22,
    gunnery: 20, seamanship: 45, morale: 30, speed: 52, prize: [800, 6000], fights: false,
  },
  privateer: {
    name: 'privateer brig', flag: 'French', broadside: 42, tons: 200, crew: 90,
    gunnery: 40, seamanship: 62, morale: 55, speed: 66, prize: [1500, 3500], fights: true,
  },
  // A typical French 36 of the period (12- and 18-pounder ships both served;
  // this row averages them). VERIFY against Winfield's French volume.
  french: {
    name: 'frigate', flag: 'French', broadside: 250, tons: 950, crew: 300,
    gunnery: 45, seamanship: 48, morale: 55, speed: 63, prize: [15000, 25000], fights: true,
  },
  spanish: {
    name: 'frigate', flag: 'Spanish', broadside: 200, tons: 900, crew: 300,
    gunnery: 35, seamanship: 42, morale: 45, speed: 57, prize: [18000, 40000], fights: true,
  },
  american: {
    name: 'heavy frigate', flag: 'American', broadside: 620, tons: 1530, crew: 450,
    gunnery: 74, seamanship: 70, morale: 70, speed: 64, prize: [20000, 30000], fights: true,
  },
};
