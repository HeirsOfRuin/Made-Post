# Frame: the story matches what happened, and a freer voyage

## The author's request

> "make sure any 'story' scenes match what is happening, and don't feel like if
> an action did or didn't happen, that you are getting left behind (my commander
> didn't get a promotion after the glorious first of june, and the ending scene
> of that season felt like i was supposed to. also, make it feel a bit more
> sandbox-esque, less like you are just going through the set of event cards
> listed in order"

## What was wrong

- After the Glorious First of June the act break said the Admiralty was
  "deciding which young commanders deserve promotion", then opened "Act 2: Made
  Post. Captain of a frigate..." whether or not you had been promoted.
- Being passed over was common: 62% of fair naval-family players were promoted,
  18% of gentry and 7% from the lower deck (150 runs each).
- The five Act 1 lessons came on fixed weeks (1, 2, 3, 5, 6), in the same order
  every game, and some kind of event card came up in 66% of weeks at sea.
- Between cards the only thing to do was press "Next week".

## What was built

**Story matches state**
- The Act 1 to Act 2 break has two versions. Promoted: named in the list, a
  frigate will follow. Passed over: your name is not on the list; many good
  commanders were passed over that summer (Howe's dispatch famously left out
  half the officers who fought); you keep your sloop, and your chance.
- Acts 2 to 4 have a commander's opening for players not yet made post.
- Act 2 is renamed "The Restless Fleet" (it was "Made Post", which told a
  passed-over player he had been).
- Doing well in the battle names you in the admiral's dispatch, which counts
  heavily toward promotion. Each later return lowers the bar further (14 points,
  was 8), and the report says when your next chance comes.
- Smaller fixes: the Trafalgar scene no longer assumes a frigate; the
  fresh-food event no longer calls a dispatch run a "convoy".
- `test/story.test.js` fails if a commander is ever told he was made post or
  given a captain's act opening, or a captain told he was passed over.

**A freer voyage**
- **Course**, chosen week by week on cruises and blockades (convoys and
  dispatches keep a fixed route, as they did). Inshore: many small cheap
  prizes, few warships, shoals that damage the hull, and boat raids possible.
  On a blockade the admiral sees you close in. Patrol: the usual mix. Offshore:
  fewer ships, rich merchants worth 2.4 times as much, more enemy frigates, safe
  in a gale.
- **One optional action a week**: a boat raid (inshore only; a prize or men
  lost), a rest day (no training, the men rest), or return home early (cruises,
  after half the weeks).
- **The week in a few lines**, from what actually happened: men punished and
  lashes given, deaths, desertions, training gained, a shoal, a raid.
- **Lessons come up when they apply**: the punishment lesson when the first
  offence happens, the powder lesson when you are training the guns, each by a
  latest week. They now arrive in a different order and week each game.
- Event cards from the ship come up less often: a card now appears in 55% of
  weeks, down from 66%.

**Score change.** The score counted the number of prizes and capped wealth at
£10,000, which almost every career passed, so many cheap coasters beat one rich
prize. Prizes now count through wealth (£1,000 a point, up to £50,000) and the
record counts fights. Scores are lower across the board; the comparisons hold.

## Measured

Promotion at the end of Act 1 (150 runs each):

| Background | Fair, before | Fair, after | Lazy, after |
|---|---|---|---|
| Naval family | 62% | 76% | 42% |
| Gentry | 18% | 65% | 40% |
| Lower deck | 7% | 41% | 4% |

Course, fair captain, whole careers (150 runs each):

| Course | Median score | Lost a ship | Prizes per career | Mean money |
|---|---|---|---|---|
| Inshore | 188 | 20% | 18.9 | £29,619 |
| Patrol | 189 | 35% | 15.1 | £36,254 |
| Offshore | 181 | 41% | 12.6 | £38,090 |

No course dominates: inshore is safest, offshore makes the most money and loses
the most ships.

Whole careers, 200 runs per policy: fair 90.5% survive, median 188; harsh
murdered 17.5%, median 56; drilled median 186; lazy 91. The three tests of
success still pass.

## Not done

- No map: courses are three bands, not places.
- Raids are one roll; they could become a short scene like a battle.
- Convoy and dispatch voyages have no course choice, by design, so they still
  feel more on rails. A choice of route speed against safety would fit them.
