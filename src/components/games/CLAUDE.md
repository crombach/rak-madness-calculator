# games

The `/:season/:week/games` route: every game of the week, one scoreboard
each. `/live` redirects here.

- `GamesPage`: what `App.tsx` mounts. The route at once when its chunk is in,
  else `GamesSkeleton` until it is.
- `loadGamesRoute`: that chunk, fetched ahead by `ResultsFrame`.
- `GamesRoute`: redirects to the scoreboard without the experimental opt-in,
  else renders `Games`. A settled week stays.
- `Games`: `useLiveWeek` polls every open league, a busy bar under the caption
  while a live one is fetched. Sections Live, Today, Tomorrow, Upcoming, then
  Completed, latest kickoff first. An empty section other than Live is left out.
- `GameCard`: a `GameStatusSummary` banded with its label, name and `GameMark`.
- `kickoffDay`: a kickoff's day in the reader's time zone.
- `GamesSkeleton`: `GameCard` on a stand-in game, text hidden under fills.
  Also while the week loads.
