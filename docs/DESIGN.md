# Made Post: design and build record

The brief is `docs/BRIEF.md` (as supplied, unchanged). This file records what was
built from it, the decisions taken on the author's behalf, what was measured, and
what is still open. Where the build differs from the brief, this file says so and
says why. Newest decisions go at the top of the log.

Status: **Phase 1, the working framework.** The whole arc (Act 1 to Act 4) plays
end to end in the browser and headless. Every system in the brief's first-version
scope exists at bare-bones depth. Nothing has been played by a person yet.

---

## 1. Decisions taken for this build

These were taken so the framework could exist. Each is cheap to change; each is
flagged for the author.

| # | Decision | Why | Change it in |
|---|---|---|---|
| D1 | **Stack: plain ES modules, no build step, no dependencies.** The engine runs in Node for the bot and tests and in the browser unchanged. | The game is simulation-heavy, not prose-heavy. Same shape as The Lists and Centennial Farm. | - |
| D2 | **Calendar runs weekly during a commission and jumps between them.** About 105 weeks are played across 22 years. | A 60 to 90 minute run (brief section 10) cannot play 1,150 weeks. History passed during a jump arrives as news in port. | `src/data/acts.data.js` |
| D3 | **Ten commissions:** 1 in Act 1, 3 in each later act. Dates, orders, stations and admirals are in one table. | Brief section 10 asks for 2 or 3 per act. | `acts.data.js` |
| D4 | **Standing orders, not daily micro-management.** Drill, rations, work and punishment are set once and run every week. Individual cases come up as decisions. | Phone play; most weeks should be one tap. | `game.js ORDER_CHOICES`, `config.data.js` |
| D5 | **Punishment model.** Offences are generated from discipline, morale and the share of pressed men. The standing order sets severity against each offence's gravity (firm = fits, harsh = 1.5 steps over, lenient = 1 under). Fairness rises when punishment fits and falls hard when it exceeds the offence. | Brief 6.2: consistency and proportion are what the men judge. | `effects.js punish()` |
| D6 | **Both failure modes are separate mechanisms.** Unfairness feeds grievance, which climbs a four-step warning ladder (muttering, round robin, refusal, mutiny); each step is a decision. Low discipline (below 25) instead causes accidents, typhus, worse sailing and fighting, and an admiral's "slack ship" mark. | Brief rule 2: show anarchy and the *Hermione*. | `week.js`, `content/events.js` |
| D7 | **Mutiny outcomes:** a Spithead-style strike (commission ends, inquiry, reputation hit, the men may have you replaced), suppression (ringleaders hanged), seizure (set adrift, ship lost, court-martial), or murder if fairness is below 25 when it breaks. | Brief 6.2 asks for at least three. | `career.js mutinyOutcome()` |
| D8 | **Battles: four phases, one resolver.** Approach (gauge, false colours, refuse), engage (long, close, rake), decide (pound, board, break off), aftermath (prize crew or burn). Damage = broadside x accuracy x rate of fire x morale x manning x the day's fortune. | Brief 6.7. Rate of fire was added because drill bought speed as much as accuracy. | `battle.js`, `config.battle` |
| D9 | **Enemy statistics are drawn once per fight and kept in state.** | Reloading cannot re-roll an enemy (skill rule). | `battle.js startBattle()` |
| D10 | **Avoiding a clearly heavier ship is "obeying orders".** Option tags flip when the enemy outweighs you by a third. | After 1812 the Admiralty ordered frigates not to fight the American 44s alone. A bot that always engaged lost a ship in most careers. | `content/events.js sighting` |
| D11 | **Crew carry-over.** A new ship takes a share of your old crew (25 to 70% by your name among the men) and their trained skill in proportion. Named men follow you. | Keeps "the crew you built" meaningful across ships. | `state.js assignShip()` |
| D12 | **Ship assignment by posting score** (interest, service and public reputation, ships lost, mutinies). Heavy frigates only in Act 4. Below 30, no ship for one commission. | Brief 6.6 and the "career feels random" risk: the score and its parts are on the Career tab. | `career.js offeredClass()` |
| D13 | **Made post** at the end of Act 1 if performance (service, interest, actions won, prizes) reaches 55; otherwise rechecked at each return with the bar 8 lower each time. | Brief Act 1. | `career.js` |
| D14 | **The service forgets.** Service reputation moves a tenth of the way back toward 40 each commission. | Without it every career pinned at 100 by Act 3 and later actions meant nothing. | `career.js endCommission()` |
| D15 | **Open questions 2-5 taken on the brief's recommendations:** lower-deck background available from the start; no map (abstract stations); text only, plus a generated icon. Refusing a posting (Q3) is **not built**; see section 6. | Brief section 12. | - |

## 2. Architecture

```
src/data/       Logic-free tables: config, ships and enemies, orders, acts and history, cast
src/content/    Events: text, options and effects as data (ops lists)
src/engine/     Pure engine. No DOM, no Math.random, no Date.now
  game.js         Facade: newGame(), choose(state, input), view(state)
  week.js         One week at sea, in ten written phases
  battle.js       The one battle resolver
  career.js       Commissions, reports, promotion, courts-martial, mutiny outcomes, endings
  port.js         Fitting out
  effects.js      Applies and describes effect ops; the punishment/fairness model
  derive.js       Every shown number (morale, effective skill, posting score, odds bands)
  ending.js       Score and Naval Chronicle obituary
  state.js        New game, the money chokepoint, ship and crew assignment
  rng.js          Seeded RNG with named streams (from the game-building kit)
src/ui/         The page: reads view(), sends choose(); computes nothing
sim/            Bot, batch runner, duel harness, inert check
test/           Invariants, content, saves, the brief's three success tests
tools/          Phone smoke test, icon generator
```

Rules the code is organised around (from the game-building skill):

- **One derivation per number.** The "At stake" line under every choice is built
  from the option's own effect list, and odds bands come from the same chance
  function that resolves the check.
- **Effects as data.** Event options declare ops (`['driver', 'fairness', 5]`,
  `['punish', gravity, severity, who]`, `['battle', 'french']`); `effects.js`
  both applies and describes them.
- **Named RNG streams** derived from (seed, turn, system), so adding a draw to one
  system does not reshuffle the others.
- **One money chokepoint** (`money()` writes the ledger); a test asserts purse == ledger.
- **Saves:** key `madepost.save.v1` (never rename it), payload carries `v`,
  `migrate()` chain is in place and empty, text export `MADP1.` + base64url JSON.

## 3. What exists

| Area | Built |
|---|---|
| Acts | 4 acts, 10 commissions, act-break screens (Peace of Amiens with a half-pay choice), ending in 1815 |
| Orders | Convoy, blockade, cruise, dispatches; each changes sighting odds, the men's prospects, the flag's prize share and what "leaving orders" means |
| Crew | 5 groups; pressed men won over by fair treatment, landsmen trained by seamanship drill, ordinary rated able with time; desertion when unhappy near land and on liberty |
| Named men | 6 (boatswain, gunner, ringleader, sea lawyer, promising landsman, captain of the foretop). Each has a stance that drifts with what he cares about and a line on the Crew tab saying what the ship is thinking |
| Officers | First lieutenant (Act 1: the teacher, Mr Prowse), master, surgeon, 2 midshipmen; faults (cruel, drink, debt, slack) act every week until curbed |
| Morale | The 5 drivers, weighted; warning signs listed on the Crew tab; four-step mutiny ladder; 4 outcomes |
| Discipline | 5-step scale (admonish to three dozen lashes), standing policy, case decisions, the 12-lash regulation counted, lash rate per 100 men per year |
| Health | Scurvy before lemon juice (1795) after 8 weeks without fresh food, ship fever in a dirty crowded ship, surgeon skill sets mortality and how many wounded recover |
| Ship | 4 classes, hull, rigging, food, water, powder; 5 traits that each act every week they apply |
| Engagements | 4 phases, 5 enemy types (merchantman, privateer, French, Spanish, American 44) |
| Career | Interest, patron, service/public/lower-deck reputation, prize money by the pre- and post-1808 shares, half pay, post list seniority, courts-martial |
| History | 24 dated items; Spithead and the Nore are decisions for a ship off Brest in 1797; Spain and the US appear only while at war (tested) |
| Events | 5 tutorial lessons, 2 finales (Glorious First of June, Trafalgar), 2 history tests, 4 mutiny steps, sightings, 13 system events |
| Ending | Six-part score shown with its parts; obituary in the *Naval Chronicle* manner built from the final state |
| Platform | Phone-first page, saves on every move, save code, service worker, manifest and icons |

## 4. Measured (this build)

### Whole careers, 200 runs per policy (`node sim/run.js 200`)

The bot plays through the same facade as the page. Policies: **fair** (firm
punishment, mixed drill, fair answers), **harsh** (harsh punishment and harsh
answers), **strict** (harsh standing order, fair answers), **lenient**,
**drilled** (gunnery drill, buys powder), **lazy** (no drill).

| Policy | Survived | Killed | Murdered by crew | Dismissed | Any mutiny | Lost a ship | Median score (p10-p90) | Median £ | Lashes /100 men /yr |
|---|---|---|---|---|---|---|---|---|---|
| fair | 90.5% | 7.0% | 0% | 2.5% | 0% | 36% | 211 (153-247) | 32,032 | 129 |
| drilled | 95.5% | 2.5% | 0% | 2.0% | 0% | 49% | 214 (141-249) | 31,455 | 132 |
| strict | 92.5% | 4.5% | 0.5% | 2.5% | 0.5% | 71% | 158 (96-204) | 15,310 | 912 |
| lenient | 80.0% | 6.5% | 0% | 13.5% | 0% | 90% | 132 (80-169) | 8,418 | 0 |
| lazy | 87.5% | 6.0% | 0% | 6.5% | 0% | 81% | 97 (36-138) | 5,685 | 130 |
| harsh | 78.0% | 3.5% | 15.5% | 3.0% | 97% | 60% | 84 (17-145) | 11,250 | 360 |

1 SE on a rate is at most ±3.5 points at 200 runs; gaps under about 7 points are noise.
Debt ruin happened in 0 of 1,200 careers (see section 6).

### Single-ship actions, 300 per cell (`node sim/duel.js 300`)

Crew skill as gunnery/seamanship: lazy 35/45, fair 55/55, drilled 85/65. Plan:
weather gauge, close, pound, prize. Cells are won / lost (the rest are drawn or
the enemy escaped).

| Ship | Enemy | Lazy | Fair | Drilled |
|---|---|---|---|---|
| sloop | privateer | 2 / 0 | 89 / 0 | 99 / 0 |
| 32 | Spanish frigate | 1 / 1 | 76 / 0 | 99 / 0 |
| 32 | French frigate | 0 / 78 | 13 / 63 | 96 / 3 |
| 38 | French frigate | 23 / 10 | 98 / 0 | 99 / 0 |
| 38 | American 44 | 0 / 99 | 0 / 99 | 0 / 99 |
| 40 | American 44 | 0 / 99 | 0 / 99 | 27 / 72 |

Captain killed: about 1% of actions (3% boarding).

### The brief's three tests (section 10), asserted in `test/balance.test.js`

1. **Harsh and fair careers differ.** Harsh: a mutiny in 97% of careers, murdered
   in 15.5%, median score 84. Fair: no mutinies, median 211. *Passes.*
2. **Drill beats size.** A drilled 32 takes a French frigate 96% of the time; a
   lazy 38, a bigger ship, 23%. Drilled careers win a median 80% of actions,
   lazy ones 40%. *Passes.*
3. **Runs end differently.** Five ending kinds are reachable; four appear in 120
   careers (peace, killed, murdered, dismissed). *Passes, but debt ruin is never reached.*

Not yet measured: run length in minutes for a person. The bot takes about 105
weeks and 250 decisions; the brief's 60 to 90 minutes is plausible only if most
weeks are one tap. Needs a human playtest.

### What the instruments caught while building

- First batch: **37% of fair captains killed** and 74% lost a ship. Captain death
  per broadside was ~1%; most fights were draws. Fixed: death 0.25% per close
  broadside, casualties tied to hull damage, rate of fire from drill.
- **French frigate statted as the big 40-gun 18-pounder** type; most were smaller.
  Re-statted as a typical 36. Fair careers losing a ship fell from 84% to 36%.
- **Lenient captains had no downside**: discipline below the anarchy line 57% of
  weeks at sea with happy crews. Added accidents, the slack-ship report and a
  steeper effect on effective skill.
- **Inert check**: three ship traits ("wet", "crank", "bad name") changed nothing,
  and "crank" declared a gale factor nothing read. Each now acts every week it
  applies; "crank" changes 7 of 30 careers on its first ship.
- **Bot fallbacks**: the harsh policy silently took the first option at act
  breaks. Every policy now answers every decision by a stated tag order, and a
  test fails on any fallback.
- **Looking at the phone screenshots**: named men never changed mood (they now
  drift with the ship and speak to its worst driver), and a single coaster paid
  a sloop commander £4,143 (merchant prizes cut to £800-6,000).

## 5. To verify before these become settled mechanics

Brief section 11 asks for this. Each is marked VERIFY in the code.

- Ship classes: guns, broadside weight, burthen and complement (`ships.data.js`).
- French frigate row (averaged 12- and 18-pounder ships).
- American 44 broadside and crew.
- The 12-lash regulation: wording and date (1731 Regulations and Instructions,
  reissued 1806) and whether it applied as a limit or a guide.
- Prize shares before and after the 1808 proclamation, and the flag officer's cut.
- Lemon juice general issue date (1795; month to confirm).
- Size of the post list (~600 in 1795?) and how fast captains moved up it.
- Rate of fire ratio between drilled British and French crews.
- Pay and half pay rates by rank and rate of ship.

## 6. Known gaps and open questions

**Gaps in this build** (carry forward):

1. **Debt ruin is unreachable** (0 of 1,200). Living costs ashore and the table
   are too cheap against prize money. Needs money sinks: the table, followers'
   expenses, a patron's demands, lawsuits.
2. **Battle outcomes are too predictable at the extremes** (many cells at 0% or
   99%). "Chance moves numbers, not outcomes" is right in principle, but a fair
   32 against a French frigate should not be a near-certain loss.
3. **Battle plans are not each best somewhere.** Close-and-pound is best or
   near-best everywhere; long range and the rake need situations that favour
   them (long range against a ship with more men, raking with the gauge and a
   seamanship edge). Measure with `sim/duel.js` before changing.
4. **Lenient captains are dismissed 13.5% of the time** via lost ships. That is
   the slack-ship mechanism working, but check it reads to a player as cause
   and effect.
5. **The American 44 is unbeatable except by a drilled heavy frigate.** Defensible
   historically, but there is no *Shannon* moment for the player: *Chesapeake*
   was a 38. Consider an American 38 enemy for 1813.
6. **Refusing a posting** (open question 3) is not built.
7. **Officers do not change between commissions** except by promotion or a new
   ship, and are not yet a source of followers beyond midshipmen.
8. **Not yet played by a person.** Fun, pacing and the voice need the author.
9. **No chapter jump** for testing later acts quickly from the page.

**Open questions for the author** (from the brief, updated):

1. Title: kept "Made Post".
2. Lower-deck background: available from the start (built).
3. Refusing a posting: recommended yes, at a cost to interest. Not built.
4. Map: abstract stations (built).
5. Art: text only plus a generated icon in this build. Ship profiles and signal
   flags remain the recommended identity.
6. **New:** target difficulty. What share of careers should end in each way? The
   fair bot survives 90% and is made post 98%; most captains in history were
   neither killed nor made rich. Give targets and the tuning follows.

## 7. Next steps (recommended order)

1. Author plays Act 1 and one later commission; verdict on voice, density, and
   whether weekly turns feel empty (brief risk table).
2. Calibration round: three events at full polish (a punishment case, the
   Spithead decision, one action), to settle the voice before writing more.
3. Fix gaps 1-3 with the duel harness and the batch runner.
4. Verification pass on section 5.
5. Then deepen one act at a time.

## 8. Decisions log

| Date | Entry |
|---|---|
| 2026-10-28 | **Phase 1 framework built from the brief.** The author: "Let's build this out. I want a working framework that we can then decide and build upon." All of section 10's scope at bare-bones depth, the three success tests asserted, 6 bot policies x 200 careers measured (section 4). Decisions D1-D15 taken on the author's behalf and listed for review. |
