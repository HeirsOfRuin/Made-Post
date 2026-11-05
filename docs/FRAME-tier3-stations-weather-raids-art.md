# Frame: distant stations, weather, raids and art (Tier 3)

## The author's request

> "Go ahead with tier 3." Agreed scope: other stations (the Caribbean, the
> Baltic, the East Indies), refusing a posting (the brief's open question 3),
> boat raids as short scenes, ship art; plus giving long range a reason to
> exist (carried from Tier 2).

## What was built

**Distant stations** (`src/data/stations.data.js`)
- In port, "Other postings" lets you ask for a distant station in place of
  your home orders, on five of the ten voyages: Jamaica (1795, 1800, 1803,
  1807), the East Indies (1803, 1807, 1809) and the Baltic (1809). Asking
  spends influence; the answer depends on how much you have.
- Jamaica: richer prizes (x2), French and Spanish trade (Spain only while at
  war), yellow fever every week, worse for a crew new to the islands.
- East Indies: four weeks of passage round the Cape with nothing sighted, then
  the richest prizes in the game (x2.5); a scene rounding the Cape; Surcouf's
  Revenant if it is 1807-08, a Mauritius privateer otherwise.
- Baltic: convoys through the Belts, where the Danish gunboats come out in
  calms; rowed, low, hard to hit.
- Far from the Admiralty, good work is noticed less (reports x0.6-0.9).
- Admirals by date: Ford, Hyde Parker, Hugh Seymour, Duckworth and Dacres at
  Jamaica; Rainier, Pellew and Drury in the East Indies; Saumarez in the
  Baltic. Listed for verification.
- Sighting pools only include a nation while at war with Britain (tested).

**Declining a posting** (open question 3): go home on half pay for one voyage,
at a cost of 6 influence and 4 name in the navy.

**Weather in battle**: every fight has light airs, a fresh breeze or a heavy
sea, shown on the battle screen.
- Light airs: whoever wants the range keeps it, raking is harder, neither ship
  can board, long-range gunnery is steadier. Gunboats only come out in a calm.
- Heavy sea: everyone's aim suffers, a small ship's most; no boarding.

**Boat raids as scenes**: the raid action now opens a two-step scene. How you
go in (silently in the middle watch, fast at dusk, or call it off), then what
you do alongside (board, cut her cable and tow her out, or burn her), with the
odds shifting on whether she was ready for you.

**Ship art** (`src/ui/art.js`): ships drawn in code as SVG, for the title
screen, the orders card, the Ship section and both ships in battle (yours
facing right, hers facing left, smoke once firing starts, masts gone and holes
in the hull when badly damaged). Ensigns are correct for nation and date: the
British Union gains St Patrick's saltire on 1 January 1801; the tricolour; the
Spanish red-yellow-red; the 15-stripe American flag (simplified); the
split-tailed Dannebrog. Each flag hoists at the staff. `tools/ship-sheet.mjs`
draws every shape and flag on one sheet for checking.

## Measured

Distant stations, fair captain, 30-150 careers: asking for them raises median
money from £42,400 to £70,700 and median deaths from sickness from 3 to 25.
Per voyage: an East Indies voyage nets about £17,000-21,000 against near
nothing for the home voyage in the same slot; Jamaica costs about 18-20 men to
fever. A drilled captain who also sails offshore does worse there (more French
frigates): the station suits some styles of play, not all.

Battle plans with weather: long range is the safest plan in every outmatched
situation and closer in a calm (12 against pound 24, board 41), but still not
the outright best anywhere. That is left as it is.

Careers, 200 per policy: fair 90.5% survive, median score 218, name in the navy
86; harsh murdered 17%; drilled survival 81% (it now asks for distant stations,
fever and the Mauritius frigates included).

## Not done

- Signal flags: Popham's 1803 code used numeral flags whose designs need
  checking against a source before they are drawn; left out rather than guessed.
- Long range is still never the best plan outright.
- No Leeward Islands, Cape or Mediterranean-as-distant postings.

## Verification

33 tests pass (new: distant postings have real admirals and enemies at war;
distant service pays more and kills more; declining works and the career goes
on; raids come up in two steps; all three weathers occur; every ship and flag
draws, and the 1801 Union differs). Inert check clean, including asking for
each station and declining. Phone smoke clean; title, battle and port looked at
at 390px; ship sheet looked at.
