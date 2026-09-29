# liveGames

The `/:season/:week/live` route: every game of the week not over, one
scoreboard each.

- `LiveGamesPage`: what `App.tsx` mounts. The route at once when its chunk is
  in, else `LiveGamesSkeleton` until it is.
- `loadLiveGamesRoute`: that chunk, fetched ahead by `ResultsFrame`.
- `LiveGamesRoute`: redirects to the scoreboard without the experimental
  opt-in or once the week is settled, else renders `LiveGames`.
- `LiveGames`: `useLiveWeek` polls every open league, a busy bar under the
  caption while a live one is fetched. Each game is a brief `GameStatusSummary`
  in a card banded with its `HEADING_MARK`, label and `SpreadLine`. Sections
  Today, Tomorrow and Upcoming follow Live.
- `kickoffDay`: a kickoff's day in the reader's time zone.
- `LiveGamesSkeleton`: the wireframe, also while the week loads.
