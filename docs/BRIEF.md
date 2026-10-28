# Made Post: Design Brief (working title)

Purpose of this document: the starting brief for building this game. It sets the
concept, the historical frame, the systems, the act structure and the scope of the
first playable version. The "Open questions" section lists decisions still to make,
not settled ones.

"Made post" was the Royal Navy phrase for promotion to post-captain, the rank that
mattered.

---

## 1. Pitch

You command a Royal Navy warship from 1793 to 1815, through the French Revolutionary
and Napoleonic Wars. You start as a newly made commander of a small sloop and, if you
survive and earn it, go on to captain frigates. The sea, the enemy and the Admiralty
all matter, but the real game is your crew: about 250 men, many pressed into service
against their will, living in one wooden box for months. Every decision is a leadership
decision. If you flog too much they mutiny. If you flog too little, discipline breaks
down. If you train them hard, it costs powder and goodwill and wins battles. The war
ends in 1815, and most captains go home on half pay. How you end that career is your
score.

- **Genre:** turn-based leadership and management sim with a narrative layer. Single
  player. Browser, built phone-first.
- **Tone:** grounded, practical, unsentimental. Patrick O'Brian's Aubrey-Maturin novels
  and C.S. Forester's Hornblower novels are the closest touchstones, kept to the
  historical record.
- **What sets it apart:** most naval games are about tactics. This one is about
  command: the crew, the officers, the orders and the career. Battles happen, but they
  are short. They test the ship you built before the fight.

## 2. Why this period

- **The richest record of shipboard leadership there is.** Logbooks, muster books,
  punishment returns, courts-martial and captains' letters all survive. The rules
  were written down in the Articles of War, which were read aloud to the crew.
- **Leadership had visible consequences.**
  - **The 1797 mutinies at Spithead and the Nore** were organized fleet strikes over
    pay and conditions. They were largely orderly and partly successful.
  - **The *Hermione* mutiny (1797)** went the other way. Captain Hugh Pigot was cruel
    and capricious, and his crew murdered him and most of his officers. It is the
    defining cautionary tale.
  - **HMS *Shannon* against USS *Chesapeake* (1813).** Captain Philip Broke had spent
    years drilling his gun crews, much of it at his own expense, and took the
    *Chesapeake* in about 15 minutes. It is the defining case for training.
  - **Thomas Cochrane** in the small sloop *Speedy* took the much larger Spanish
    frigate *El Gamo* (1801) through audacity and a crew that trusted him.
- **Career pressure was built into the system.** Promotion depended on "interest"
  (patrons in the service and in politics), seniority and luck. Prize money could make
  a captain rich in a single cruise. Losing a ship meant an automatic court-martial.

## 3. The player character

- An invented officer, about 28 years old in 1793, newly promoted from lieutenant to
  commander.
- **Background choice** (sets starting interest, money and skills):
  - Naval family: high interest, modest money.
  - Gentry younger son: some money and some interest.
  - Came up from the lower deck: no interest and seamanship the men respect. This
    was rare, but it happened.
- Traits develop through play: seamanship, gunnery, temper, reputation with the men,
  reputation with the Admiralty.

## 4. Act structure

The game has four acts. Act 1 is short and works as the tutorial. Acts 2 to 4 are
longer, and each covers a stage of the career tied to a phase of the war. Each act
ends on a historical turning point.

### Act 1: First Command (1793 to 1794). Tutorial.

- **Situation:** war with Revolutionary France has just begun. You are given a small
  sloop with a half-trained crew made up partly of pressed men.
- **Teacher:** your first lieutenant or the ship's master, a seasoned older man who
  advises you, sometimes too bluntly.
- **Lessons, one at a time:**
  - Manning the ship: recruiting, the press, quota men.
  - Setting watches and divisions.
  - Your first punishment decision.
  - Gunnery drill against conserving powder.
  - Following orders against using your initiative.
  - A small action: a privateer or a coastal convoy.
- **Ends on:** the Glorious First of June (1794). Your sloop repeats signals or carries
  dispatches. Your performance decides whether you are made post.
- **Length:** short. About 6 to 8 turns.

### Act 2: Made Post (1795 to 1801)

- **Situation:** your first frigate. Frigates were small, fast warships, "the eyes of
  the fleet," and the best posting for prize money.
- **Historical events:**
  - 1795: lemon juice issued to the fleet, which brings scurvy under control.
  - 1797: the Spithead and Nore mutinies; the *Hermione* mutiny; the battles of
    Cape St Vincent and Camperdown.
  - 1798: the battle of the Nile.
  - 1801: the battle of Copenhagen.
- **Main theme:** building your ship and your crew. The 1797 mutinies test whatever
  you have built.
- **Ends on:** 1801 and 1802, the Peace of Amiens. Many ships are paid off, so you may
  be ashore on half pay, waiting for a new command.

### Act 3: The Long Blockade (1803 to 1807)

- **Situation:** the war resumes. You face years of close blockade off Brest or
  Toulon, grinding and dull, punctuated by sudden action.
- **Historical events:**
  - 1803: war resumes.
  - 1804: Napoleon crowned emperor; invasion fears.
  - 1805: the Trafalgar campaign.
  - 1806 to 1807: the Continental System, Napoleon's attempt to close European ports
    to British trade.
- **Main theme:** endurance. Keeping a crew healthy, disciplined and sane through
  months of boredom.
- **Ends on:** Trafalgar (21 October 1805) as the turning point, with the act running
  on to 1807. Frigates did not fight in the line of battle, but they scouted and
  repeated signals.

### Act 4: The Last War (1808 to 1815)

- **Situation:** you are a senior captain, perhaps commanding a heavy frigate.
- **Historical events:**
  - 1808 onward: supporting the army in the Peninsula.
  - 1812: war with the United States. American 44-gun frigates beat British frigates
    in single-ship actions (*Guerriere*, *Macedonian*, *Java*), a public shock.
  - 1813: *Shannon* against *Chesapeake*.
  - 1814: Napoleon abdicates.
  - 1815: the Hundred Days and Waterloo.
- **Main theme:** proving yourself against a tougher enemy, and preparing for the
  peace.
- **End:** 1815. Most of the fleet is paid off and captains go ashore on half pay.
  Your final rank, wealth, reputation and the officers you raised are your score.

## 5. Core loop

The unit of play is a **commission**: you are given a ship and orders, you carry them
out, and you return.

1. **Orders:** convoy escort, blockade station, independent cruise (the prize-money
   prize), dispatches, or scouting for the fleet. Orders come with expectations and
   discretion.
2. **Fit out in port:** crew (recruit or press), stores, powder, water, refits,
   officers.
3. **At sea:** each turn is about a week.
   - **Daily routine:** set the drill (gunnery or seamanship), food, the work load,
     punishments.
   - **Events** come from the systems: weather, illness, crew trouble, sightings.
   - **Decisions:** chase or let go, engage or avoid, follow orders or use initiative.
4. **Engagement** (when it happens): a short, phase-based fight (see section 6.7).
5. **Return to port:**
   - Prizes sent to the Admiralty court to be judged and paid out.
   - Reports, the *Gazette*, the Admiralty's response.
   - Letters, patrons, promotions, refit.
6. **Career update:** reputation, interest, money, next orders, or half pay.

## 6. Systems

### 6.1 Crew

Track the crew as groups, not 250 individuals:

| Group | Notes |
|---|---|
| Able seamen | Skilled. Valued. Will desert if badly treated. |
| Ordinary seamen | Some skill. The core of the crew. |
| Landsmen | Unskilled. Need training. |
| Pressed men | Unwilling. High desertion and mutiny risk at first. Can be won over. |
| Marines | Soldiers aboard. Keep order and fight at close quarters. Loyal to their own officer. |

Crew stats:

- **Skill:** seamanship and gunnery tracked separately. They rise with drill and
  experience and fall with deaths and new men.
- **Health:** affected by food, scurvy, fever in tropical stations, and wounds.
- **Morale:** see section 6.2.
- **Numbers:** losses come from death, desertion, sickness, and prize crews (men
  sent off to sail captured ships).

Also track **6 to 10 named men**: a boatswain, a gunner, a ringleader, a promising
landsman, a sea lawyer (a man who knows his rights and makes trouble about them).
These give the crew faces and stories.

### 6.2 Morale and discipline (the core system)

Morale is not one number. It comes from what the men believe about their captain and
their ship:

| Driver | Raised by | Lowered by |
|---|---|---|
| **Fairness** | Consistent, explained punishment. Just treatment. | Arbitrary punishment, favourites, cruelty. |
| **Provisions** | Good food, fresh meat and vegetables, the grog ration | Spoiled stores, short rations |
| **Work load** | Sensible watches, rest | Constant work, punishment by work |
| **Prospects** | Prize money, success, a lucky ship | Long blockade, defeats, no prizes |
| **Trust in the captain** | Seamanship, courage, care for the wounded | Errors, cowardice, losing men for nothing |

Discipline is your instrument:

- **The punishment scale:** stopping grog, extra duty, starting (beating with a rope's
  end), flogging, court-martial.
- Officially a captain could order only a limited number of lashes without a
  court-martial. In practice captains often exceeded it. **Verify the exact rule.**
- **The trade-off:** not enough discipline and the ship falls apart. Too much, or
  unfair discipline, and morale drops toward mutiny.
- **Mutiny risk** builds from low morale combined with grievances and a ringleader.
  It comes with warning signs: muttering, petitions, round robins (petitions signed
  in a circle so no one signs first), deserters.
- **Outcomes run from** a petition, to refusing duty, to a Spithead-style strike, to a
  *Hermione*-style murder. Your choices at each warning sign matter.

### 6.3 Officers

- First and second lieutenants, the master, the surgeon, the purser, the Marine
  officer, 2 to 4 midshipmen.
- Each has competence, loyalty to you, ambition, and their own faults (drink,
  cruelty, debt).
- **They act on their own.** A cruel lieutenant damages morale even if you are fair. A
  drunk master runs you aground.
- **Patronage works both ways.** Recommending your officers for promotion builds your
  "followers," who serve you later and add to your standing. Your protégés are part of
  your score.

### 6.4 The ship

- Hull, masts and rigging, stores (food, water, powder and shot), and condition.
- Damage comes from weather, battle and long cruises. Ships need refits.
- **Ship classes, first draft:**
  - Sloop: about 16 to 18 guns.
  - Small frigate: 28 to 32 guns.
  - Standard frigate: 36 to 38 guns.
  - Heavy frigate: 40 or more guns.

  **Verify guns and crew sizes for each class.**
- **Each ship has a personality:** fast, wet, crank (unstable), lucky, or with a bad
  reputation from her last captain.

### 6.5 Orders and initiative

- Every order sets expectations: hold this station, escort this convoy, cruise these
  waters.
- **Departing from orders** (chasing a prize, joining a fight) can bring glory and
  prize money, or a court-martial if it goes wrong.
- Your Admiralty standing decides how much discretion you get.

### 6.6 Career: interest, money, reputation

- **Interest:** patrons in the Admiralty and Parliament. It decides which ships you
  get, which orders, and how fast you are promoted. Patrons can fall from power.
- **Prize money:** captured ships and cargo are judged in the Admiralty court and
  paid out by shares, with the captain taking the largest share and the admiral
  taking a cut. **Verify the share rules before and after 1808.** Payouts are slow and
  can be contested in court.
- **Reputation:** your reputation in the service, your standing in the *Gazette* (the
  official record of actions) and with the public, and your name among the men. A
  good name makes recruiting easier.
- **Half pay:** with no ship, you are on half pay. Your interest decays, debts grow,
  and you lobby for a new command.
- **After post-captain**, promotion is strictly by seniority on the post list. You
  can't buy or fight your way up, only outlive the men above you.

### 6.7 Engagements (kept short)

Each engagement takes 3 or 4 decisions, resolved by systems you've built up beforehand:

1. **Approach:** the weather gauge (who is upwind and controls the fight), whether to
   accept or refuse action, deception (false colours were allowed until you opened
   fire).
2. **Engage:** long range (safer, slower) or close (decisive, bloody). Try for a rake
   (firing down the length of an enemy ship).
3. **Decide:** batter her into surrender, board, or break off.
4. **Aftermath:** casualties, damage, prize crew, care of the wounded.

What decides the fight:

- gunnery skill (from drill);
- seamanship;
- morale;
- ship condition;
- relative size.

The *Shannon* lesson should hold: drill beats size.

### 6.8 Health and the surgeon

- **Diseases:** scurvy (managed by lemon juice from 1795), typhus (from dirty and
  crowded conditions), yellow fever (the Caribbean station was deadly).
- **Wounds:** battle casualties depend on the surgeon's skill and supplies.
- **The surgeon** is a key officer and a confidant (the Stephen Maturin role).

## 7. Historical cast (first draft)

Real figures appear as admirals, patrons and rivals. Command structure keeps them
distant, which is accurate.

| Figure | Role | Use in game |
|---|---|---|
| Earl St Vincent (John Jervis) | Admiral, First Lord 1801 to 1804 | Strict discipline, hard on corruption. A demanding superior. |
| Horatio Nelson | Admiral | Rewards initiative. A distant inspiration and patron. |
| Cuthbert Collingwood | Admiral | Humane discipline, famously low use of flogging. A model. |
| Sir Edward Pellew | Frigate captain, later admiral | The model frigate captain. Possible mentor or patron. |
| Thomas Cochrane | Frigate captain | Brilliant, insubordinate, political. A rival or ally. |
| Philip Broke | Captain of *Shannon* | The gunnery model. A peer. |
| Hugh Pigot | Captain of *Hermione* | The warning. Mentioned, possibly met before 1797. |

**Invented cast:**

- your first lieutenant (the tutorial teacher);
- the surgeon;
- the master;
- 2 or 3 midshipmen;
- a patron;
- a rival captain;
- the named men from the crew;
- your family ashore (letters).

## 8. Ending and scoring

The game ends in 1815, or earlier through death, a court-martial dismissal, mutiny or
shipwreck.

Score the career on:

- **Rank and seniority** on the post list.
- **Wealth:** prize money net of debts.
- **Reputation:** in the service and with the public.
- **Your record:** actions fought, ships taken, ships lost.
- **Your people:** officers promoted, crew lost in battle and to illness.
- **Your conduct:** the punishment record. Were you a Collingwood or a Pigot?

Write a closing obituary, in the style of the *Naval Chronicle*, built from the final
state.

**Loss states:**

- killed in action;
- dismissed by court-martial (losing the ship, cowardice, disobedience);
- mutiny;
- shipwreck;
- debt ruin on half pay.

## 9. Design rules

1. **The ship is a crew problem.** Every system flows back to the crew. A good ship
   with a bad crew loses.
2. **Discipline is a tool with costs.** Show players both failure modes: anarchy and
   *Hermione*.
3. **Preparation wins battles.** Battles test what you built at sea. They are not
   tactics puzzles.
4. **Events come from systems.** Generate events from the crew, the officers, the ship
   and the orders. Hand-write only the historical turning points and the act
   transitions.
5. **Career is a long game.** Interest, patrons and seniority move slowly. Luck
   matters, which was true and should be shown.
6. **No Hollywood.** No swinging on ropes as a tactic. Boarding is brutal and costly.
   Most of the work is weather, food and people.
7. **Honest about the navy.** Pressed men were taken by force, flogging was real, and
   Black and foreign sailors served in large numbers. Show it plainly, without
   cheering it or lecturing about it.

## 10. First playable version: scope

**Goal:** a bare-bones run of the whole game, Act 1 to Act 4, so the arc and the
transitions can be tested before any act is deepened.

| Area | Bare-bones scope |
|---|---|
| Act 1 | About 6 to 8 turns. Sloop. All tutorial lessons. One small action. |
| Acts 2 to 4 | 2 or 3 commissions per act, each about 8 to 15 turns |
| Order types | Convoy, blockade, cruise, dispatches |
| Crew | 5 groups, plus 4 to 6 named men |
| Officers | First lieutenant, master, surgeon, 2 midshipmen |
| Morale | The 5 drivers, mutiny warning signs, at least 3 mutiny outcomes |
| Discipline | The punishment scale and the fairness model |
| Ship | 3 classes. Hull, rigging, stores, condition. |
| Engagements | The 3 or 4 phase model. 3 or 4 enemy types (privateer, French frigate, Spanish frigate, American heavy frigate). |
| Career | Interest, prize money (simplified), reputation, half pay |
| Historical events | Act-ending turning points, plus 1797 mutinies, peace of Amiens, War of 1812 |
| Ending | Score and a short obituary |
| Platform | Browser and phone, saving progress to the device |

**Not in the first version:** detailed sailing, fleet actions, real maps, individual
tracking of all crew, prize court lawsuits, the Caribbean or East Indies stations,
land operations.

**Test of success:**

- A player can finish a run in about 60 to 90 minutes.
- A harsh captain and a fair captain have different careers.
- A captain who drills hard wins fights a lazy captain loses, even in a smaller ship.

## 11. Risks

| Risk | Mitigation |
|---|---|
| Combat takes over the build | Battles stay 3 or 4 decisions. Build budget goes to crew and command systems. |
| Morale feels like one hidden number | Show the 5 drivers and the warning signs. Named men say what the crew is thinking. |
| Long stretches of sea time feel empty | Weekly turns with routine decisions. Skip quiet weeks. Events come from crew and ship. |
| Too close to O'Brian or Forester | Use the historical record and the cases in section 2, not the novels' plots |
| Career systems feel random | Make interest and patrons visible. Show why each promotion or posting happened. |
| Historical errors | Verify ship sizes, flogging rules and prize shares before they become mechanics |

## 12. Open questions

1. Working title. "Made Post" is the recommendation. Alternatives: "The Articles of
   War," "Weather Gauge." Avoid "Post Captain," which is the title of an O'Brian
   novel.
2. Should a lower-deck background be available from the start, or unlocked?
   (Recommended: available. It is the most interesting run.)
3. Should the player be able to refuse a posting (a bad ship, the deadly Caribbean
   station)? (Recommended: yes, at a cost to interest.)
4. Should there be a map with travel, or abstract stations? (Recommended: abstract
   stations for the first version.)
5. Art: ship profile drawings and signal flags as the visual identity, or text only for
   the first version?

## 13. Build notes for the new session

- Use the game-building skill before writing game logic. It covers seeded random
  numbers, batch runs for balancing, saving to the device and a phone smoke test.
- Separate data (ships, orders, events, the cast, the historical clock) from the
  engine.
- Build a batch-run harness early. Use it to prove the three tests in section 10:
  harsh against fair, drilled against lazy, and runs that end differently.
- Build the order as: engine and turn loop, crew and morale, discipline, ship and
  stores, orders and commissions, engagements, career, then the acts.
