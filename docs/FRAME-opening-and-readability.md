# Frame: the opening, and readability

## The author's request

> "It is a lot all up front. We need to make the wording accurate, but way more
> readable for the average person. There is too much information all up front,
> and not all of it is clear. I think the game should start with taking command
> of your first sloop, and ease the information in by letting you choose a few
> things, like type of men wanted, choose your officer group from different
> options (like old friends, men from the ranks, etc). It needs to make the
> story a bit clearer too."

## The problem

- The first screen was a port with seven actions, a ship panel and four rows of
  standing orders with numeric effects. A new player met every system at once.
- Period jargon was used without explanation ("rendezvous", "quota men",
  "splice the main brace", "weather gauge", "grievance", "interest").
- The story was in the log, not on the screen: nothing said what your orders
  meant or why they mattered.
- Some wording was inaccurate (below).

## What was built

1. **Taking command**, four screens before the first week, each one story
   paragraph and one choice: the Admiralty's letter; the officers (old
   shipmates, men from the ranks, well-connected young gentlemen, or whoever the
   Admiralty sends); the men (volunteers then the press, volunteers only, the
   press gang, landsmen); and what kind of captain (firm and fair, a taut ship,
   an easy ship). Each choice changes the game (asserted by `sim/inert.js`).
2. **One story, one decision per screen.** Detail is folded away: "How the ship
   is run", "Ship and stores", "Health and skill", "Who is aboard", money,
   reports. Locked port actions are listed under "Not available now" with their
   reasons, instead of greyed out among the live ones.
3. **Every voyage opens with an orders card**: what the orders are, what they
   mean in a sentence, and who your admiral is and what he cares about.
4. **Plain words** throughout, with the period terms the game keeps explained
   under "Words used in this game" (Log tab).
5. **One-line status** on the main screen ("The men are steady, but many are
   sick") instead of numbers.
6. **The named men each speak to their own concern** (the gunner about powder,
   the sea lawyer about the punishment book), not one shared line.
7. **Punishment choices say what they do** ("Fits the offence: the men think it
   fair") instead of repeating their label.

## Accuracy fixes

- The 12-lash limit was in the Admiralty's Regulations and Instructions, not the
  Articles of War. The tutorial now says "the regulations".
- *Hermione*: Pigot threatened to flog the last men down from the rigging; two
  fell to their deaths and he had their bodies thrown overboard. The old line
  said he flogged the last man down.
- The 1807 Biscay cruise was under Lord Gambier, who did not command there then.
  It is now St Vincent's Channel Fleet (he held it until April 1807).
- The 1809 Lisbon convoy was under Collingwood (Mediterranean). It is now
  Admiral Berkeley, who commanded at Lisbon 1808-1812.

## Measured

200 careers per bot policy, before and after (1 SE at most 3.5 points):

| Policy | Survived | Murdered | Median score |
|---|---|---|---|
| fair | 90.5% → 90.0% | 0% → 0% | 211 → 215 |
| harsh | 78.0% → 71.0% | 15.5% → 22.0% | 84 → 67 |
| lenient | 80.0% → 78.5% | 0% → 0% | 132 → 133 |
| drilled | 95.5% → 95.0% | 0% → 0% | 214 → 220 |

The harsh change is real (6.5 points against a floor of about 4): that bot now
also opens with the press gang and the Admiralty's officers. Everything else is
within noise.

## Not done

- No tutorial hints on the main screen beyond the first lieutenant's lessons.
- The Crew tab still shows numbers out of 100; they are now labelled with plain
  questions ("Do they trust you?").
