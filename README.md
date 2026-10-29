# Made Post

Command a Royal Navy warship from 1793 to 1815. You start as a newly made
commander of a sloop and, if you survive and earn it, go on to captain frigates.
The sea, the enemy and the Admiralty all matter, but the real game is the crew:
two hundred men, many of them pressed, in one wooden box for months. Every
decision is a leadership decision.

"Made post" was the Royal Navy phrase for promotion to post-captain.

**Status:** working framework (Phase 1). The whole career, Act 1 to Act 4, plays
end to end on a phone. Every system in the brief's first-version scope exists at
bare-bones depth and has been measured; none has been played by a person yet.
See `docs/DESIGN.md` for what was decided, what was measured and what is open.

## Playing it

No build step. Serve the folder and open it on a phone or desktop:

```
npm run serve        # python3 -m http.server 8000, then open http://localhost:8000
```

The game saves after every move. The Career tab shows a save code that moves a
game to another device.

## How a career runs

- **Taking command:** four short screens: the Admiralty's letter, your officers,
  your men, and what kind of captain you mean to be.
- **Port** (between voyages): man the ship (volunteers, the press, quota men), buy practice powder
  from your own purse, give liberty, recommend a midshipman, put to sea.
- **At sea, a week a turn:** standing orders for drill, rations, work and
  punishment run every week. Offences are punished under your standing order.
  At most one decision a week comes from the ship itself: a sighting, a gale, a
  case brought aft, an officer's fault, a warning sign of unrest.
- **Action:** four decisions (approach, engage, decide, aftermath) resolved by
  the crew you built: gunnery and rate of fire from drill, seamanship, morale,
  manning, the ship's condition and size.
- **Return:** prize money, your admiral's report with its reasons, interest,
  promotion, the next ship.
- **The end:** 1815, or earlier by death, court-martial, mutiny or debt. A score
  in six parts and an obituary in the manner of the *Naval Chronicle*.

## Is it true? Is it balanced?

```
npm test             # invariants, content, saves, the brief's three success tests
npm run inert        # every order, background and ship trait changes the game
npm run smoke        # drives the real page at 390x844 in Chromium
npm run sim -- 200   # whole careers by bot policy, with noise floors
npm run duel -- 300  # single-ship actions: does drill beat size?
npm run check        # tests + inert + smoke
```

Measured results are in `docs/DESIGN.md` section 4.

## Layout

```
src/data/      tables: config, ships, orders, acts and history, cast
src/content/   events as data
src/engine/    the pure engine: game.js is the only entry point
src/ui/        the page; reads view(), computes nothing
sim/           bot, batch runner, duel harness, inert check
test/          node --test suites
tools/         phone smoke test, icon generator
docs/          BRIEF.md (the starting brief), DESIGN.md (the build record)
```

## Rules the code keeps

- The engine is pure and seeded: the same seed and choices give the same career.
- What the player sees and what the engine resolves come from the same function.
- Nothing declared is decoration: a test fails if an order or trait changes nothing.
- Every greyed-out button says why.
- Saves are versioned and never change their key.

## Sources

The brief's historical frame (section 2) and the cases it names: the Spithead and
Nore mutinies and the *Hermione* (1797), *Shannon* and *Chesapeake* (1813),
Cochrane's *Speedy* and *El Gamo* (1801). Ship and enemy figures are first-draft
approximations from standard references (Gardiner; Winfield) and are listed for
verification in `docs/DESIGN.md` section 5.
