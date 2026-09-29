# liveGames

The `/:season/:week/live` route: every game of the week not over, one
scoreboard each.

- `LiveGamesPage`: what `App.tsx` mounts. The route at once when its chunk is
  in, else `LiveGamesSkeleton` until it is.
- `loadLiveGamesRoute`: that chunk, fetched ahead by `ResultsFrame`.
- `LiveGamesRoute`: redirects to the scoreboard without the experimental
  opt-in or once the week is settled, else renders `LiveGames`.
- `LiveGames`: `useLiveWeek` polls every open league, a busy bar under the
  caption while a live one is fetched. Sections Today, Tomorrow and Upcoming
  follow Live.
- `LiveGameCard`: a brief `GameStatusSummary` banded with its `HEADING_MARK`,
  label and `SpreadLine`.
- `kickoffDay`: a kickoff's day in the reader's time zone.
- `LiveGamesSkeleton`: `LiveGameCard` on a stand-in game, text hidden under
  fills. Also while the week loads.
