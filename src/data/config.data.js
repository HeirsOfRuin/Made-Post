// Every tunable number in one place. Logic-free: the engine reads these, the
// tests and the batch runner override them through opts, nothing else computes
// with a literal. Values are first-draft and marked where history fixes them.

export const CONFIG = {
  // ---- the clock ----------------------------------------------------------
  epoch: '1793-02-01',          // day 0
  weekDays: 7,

  // ---- morale: the five drivers (section 6.2 of the brief) ------------------
  // Morale is the weighted mean of the drivers. Weights sum to 1.
  driverWeights: { fairness: 0.25, trust: 0.25, provisions: 0.2, workload: 0.15, prospects: 0.15 },
  driverStart: { fairness: 55, trust: 45, provisions: 60, workload: 55, prospects: 50 },
  // Each week every driver drifts this share of the way back toward 50, so a
  // single act is remembered but not forever.
  driverDrift: 0.04,

  // ---- standing orders ----------------------------------------------------
  drill: {
    // skill gain per week before diminishing returns; powder in barrels per week
    none:       { gunnery: 0,   seamanship: 0,   powder: 0,   workload: +1.5 },
    seamanship: { gunnery: 0,   seamanship: 3.2, powder: 0,   workload: -1.5 },
    gunnery:    { gunnery: 3.6, seamanship: 0,   powder: 2,   workload: -1.5 },
    mixed:      { gunnery: 1.8, seamanship: 1.6, powder: 1,   workload: -1.0 },
  },
  skillCap: 95,
  skillDecay: 0.6,              // per week without that drill, toward the crew's base
  rations: {
    // food in weeks of full rations consumed per week; provisions driver change
    full:  { food: 1.0, provisions: +1.0 },
    short: { food: 0.67, provisions: -4.0 }, // "six-upon-four": six men on four men's rations
  },
  work: {
    light:  { workload: +3.0, wear: 1.4, seamanshipMult: 0.8 },
    normal: { workload: 0,    wear: 1.0, seamanshipMult: 1.0 },
    hard:   { workload: -4.0, wear: 0.6, seamanshipMult: 1.15 },
  },

  // ---- discipline ---------------------------------------------------------
  // Severity of each punishment on the same 0-4 scale as offence gravity.
  // Firm policy matches severity to gravity; harsh adds; lenient subtracts.
  policyShift: { lenient: -1, firm: 0, harsh: +1.5 },
  // Lashes for a flogging. The Admiralty's Regulations and Instructions (1731,
  // reissued 1806) limited a captain to 12 lashes without a court-martial;
  // in practice 24 and 36 were common. VERIFY wording before release.
  lashesRegulation: 12,
  lashesHarsh: 36,
  fairnessPerJust: 0.7,         // a punishment that fits the offence
  fairnessPerExcess: 2.4,       // per point of severity over the offence
  fairnessPerSoft: 0.35,        // per point under by more than one (favouritism)
  disciplinePerSeverity: 0.55,
  disciplineDrift: 0.9,         // per week toward the officers' level
  offenceBase: 1.6,             // offences per 100 men per week at discipline 50, morale 50

  // ---- mutiny -------------------------------------------------------------
  grievanceFromMorale: 0.22,    // per week, per point morale is under the line
  moraleLine: 45,
  grievanceDecay: 2.0,          // per week when morale is above the line
  // Warning-sign ladder: grievance thresholds for each stage.
  mutinyStages: [20, 40, 60, 80],

  // ---- health -------------------------------------------------------------
  scurvyWeeks: 8,               // weeks at sea without fresh food before scurvy
  lemonJuiceDay: '1795-04-01',  // general issue to the fleet (brief section 4; VERIFY month)
  sickMortality: 0.012,         // deaths per sick man per week, halved by a good surgeon

  // ---- ship ---------------------------------------------------------------
  wearPerWeek: 1.1,             // hull and rigging, before the work order
  galeDamage: [6, 18],

  // ---- money (pounds sterling) ----------------------------------------------
  payPerWeek: { commander: 6, captain: 8 },
  halfPayPerWeek: 3,
  tablePerWeek: 3,              // the captain's table and servants, at sea
  powderPerBarrel: 6,           // powder bought above the allowance, from your own purse (Broke)
  debtRuin: -2500,
  // Prize shares (captain's fraction of the prize's value). Before the 1808
  // proclamation the captain took 3/8, less one eighth to the flag officer when
  // under an admiral's orders. After 1808, 2/8, with the flag taking a third of
  // that. VERIFY against the 1808 Order in Council before release.
  prizeShares: {
    before1808: { captain: 3 / 8, flag: 1 / 8 },
    after1808: { captain: 2 / 8, flag: 2 / 24 },
  },
  prizeReformDay: '1808-06-01',
  prizeDelayWeeks: 0,           // first version: paid at the next return to port

  // ---- career -------------------------------------------------------------
  madePostThreshold: 55,        // performance score at the end of Act 1
  madePostEase: 14,             // the bar drops this much at each later return
  dispatchBonus: 15,            // named in the admiral's dispatch after the Act 1 battle
  postListStart: 520,           // place on the post list when made post (VERIFY: ~600 post captains in 1795)
  postListAdvancePerYear: 28,
  // Posting score below which no ship is offered for a commission.
  postingFloor: 30,

  // ---- engagements ----------------------------------------------------------
  battle: {
    accuracyFloor: 0.18,        // a raw crew still hits something
    accuracyExp: 1.45,
    fortune: 0.2,               // each side's luck for the day, +/- this share
    // Rate of fire also comes from drill: British crews at their best fired
    // about twice as fast as French ones (VERIFY the ratio; Broke, Hornblower-era sources vary).
    rateBase: 0.6, rateSkill: 0.8,
    moraleBase: 0.7,
    rangeMult: { long: 0.45, close: 1.0 },
    hullPerDamage: 0.77,        // hull points per pound of shot landed, per 100 tons of ship
    casualtyRatio: 0.6,         // share of the crew hit per point of hull lost (x jitter)
    strikeHull: 0.3,
    strikeCasualties: 0.32,
    rakeMult: 2.2,
    raked: 1.6,
    poundVolleys: 4,
    captainKilledClose: 0.0025,
    captainKilledBoard: 0.02,
  },


  // ---- events ---------------------------------------------------------------
  eventChance: 0.35,            // chance a week with no sighting brings a ship's event (was 0.55: a card nearly every week)
};
