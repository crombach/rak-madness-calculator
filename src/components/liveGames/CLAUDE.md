# liveGames

The `/:season/:week/live` route: every live or delayed game of the week, one
scoreboard each.

- `LiveGamesPage`: what `App.tsx` mounts. The route at once when its chunk is
  in, else `LiveGamesSkeleton` until it is.
- `loadLiveGamesRoute`: that chunk, fetched ahead by `ResultsFrame`.
- `LiveGamesRoute`: redirects to the scoreboard without the experimental
  opt-in, else renders `LiveGames`.
- `LiveGames`: `useLiveWeek` polls both leagues, a busy bar under the caption
  while one is fetched. Each game is a brief `GameStatusSummary` in a card
  banded with its `HEADING_MARK`, label and `SpreadLine`. Games not started yet
  list under Up next.
- `LiveGamesSkeleton`: the wireframe, also shown while the week loads.
