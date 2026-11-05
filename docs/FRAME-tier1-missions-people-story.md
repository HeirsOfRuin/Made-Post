# Frame: missions, people and story (Tier 1)

## The author's request

> "I like those ideas. I also feel the narrative and the story is a bit thin.
> And the missions dealt repetitive, not enough events, and the actions for my
> ship were the same whether I was cruising or blockading." With a save from
> 1807: "Review this data, then adjust your tiers as needed, then build out tier 1."

## What the save showed

A naval-family captain, made post at the First of June, in port in 1807:
7 fights won, none lost, 17 prizes, £33,546, no mutinies.

- **No tension.** Name in the navy at the 100 cap; every admiral's report "warm"
  or "favourable"; crew at Hope 100, Fairness 93, unrest 0.
- **Nobody changed.** Mr Prowse, first lieutenant since 1794, still there,
  unaged, never asking for anything; the same six named men across three ships.
- **Thin story.** 64 weeks at sea in 13 years; the years between voyages were
  log lines; the Nile and Copenhagen never reached the player as anything.
- **Voyages blurred.** Cruise and blockade offered the same three actions and
  nothing on screen said what a voyage was for.

## Tiers, adjusted

- **Tier 1 (built here):** missions with identity; people who change; a story
  between voyages.
- **Tier 2 (next):** difficulty and pressure (reputation saturates, crews max
  out, reports always warm), battle texture, money costs.
- **Tier 3:** other stations, art, refusing a posting, raid scenes.

## What was built

**Missions** (`src/content/missions.js`)
- Each order type has a goal with visible progress, judged in the report (+3
  met, -2 missed): a cruise hopes for prizes, a blockade expects you to look
  into the harbour, a convoy counts ships safe, dispatches count weeks ahead or
  late.
- Each order type has its own actions: cruise (boat raid, stop neutrals, rest,
  return home); blockade (look in, boat raid, fishing boats, rest); convoy
  (gather convoy, range ahead, rest); dispatches (crack on, rest).
- Order-specific events: fog sortie and the flagship dinner (blockade);
  straggler, insolent master and pressing at sea (convoy); neutral ship and
  recapture (cruise); a gale ahead (dispatches); the surgeon's private word (any).

**Set pieces** (`src/content/voyage.js`), one per voyage, placed in a window of
weeks: Pellew's frigate squadron (1795), the fleet sailing after Spithead
(1797), Cochrane in the Speedy (1800), Cornwallis hailing you off Brest (1803),
the Combined Fleet preparing to sail (1805), a coasting convoy under the
batteries (1807), an army colonel's demand (1809), a Baltimore clipper (1812),
dispatches for Wellington (1815). Squadron fights start with the enemy already
under fire; a sloop shares Pellew's prize instead of fighting a frigate alone.

**People**
- Officers gain ability each voyage (midshipmen fastest).
- Mr Prowse asks for promotion. Recommend him and he gets a sloop, writes to
  you, and may later need rescuing; refuse him and he turns bitter.
- A lieutenant you had promoted comes back as your first lieutenant on a new ship.
- Doyle can be made a boatswain's mate (and stops being a ringleader) or try to
  desert; Okafor becomes quartermaster's mate; Hartley becomes your clerk; the
  old boatswain retires, and Eriksen can replace him.

**Story** (`src/content/story.js`)
- Letters wait in port: news of the war that happened while you were away,
  your sister Anne, your patron, your rival.
- Your patron rises and falls with real changes of government (Pitt 1801 and
  1804, his death in 1806); a lower-deck patron is made admiral, and dies.
- A rival, Captain Edmund Carrow, whose career runs alongside yours and is
  compared in every report.
- Choices that come back: a neutral sent to the prize court is condemned or
  released with damages; store ships left behind off Portugal are taken.
- News that breaks while you are at sea arrives "by the packet" in the week.

## Measured

Content reach, fair bot, 100 careers: every set piece in 70-96% of careers;
Prowse's request 97%, Okafor 79%, Hartley 90%, the boatswain 91%; about 33
letters per career; a card in 64% of weeks (was 55%).

Careers, 200 per policy: fair 94% survive, lost a ship 39.5% (33% before;
69.5% before squadron fights were fixed), median score 225 (was 188, from goals
met and set-piece prizes). Harsh murdered 22%.

**Not fixed, carried to Tier 2:** name in the navy still saturates (fair median
97). Goals made it slightly worse.

## Verification

24 tests pass, including: every voyage shows a goal and the report judges it;
no two kinds of voyage share an action set; letters arrive and a prize-court
verdict comes back; a save from before this build plays on to the end. Inert
check clean for every action. Phone smoke clean; port letters and the sea goal
looked at at 390px.
