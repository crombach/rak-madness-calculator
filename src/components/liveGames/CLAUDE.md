# liveGames

The `/:season/:week/live` route: every live or delayed game of the week, one
scoreboard each.

- `LiveGamesRoute`: redirects to the scoreboard without the experimental
  opt-in, else renders `LiveGames`. Mounted lazily by `App.tsx`.
- `LiveGames`: `useLiveWeek` polls both leagues. Each game is a brief
  `GameStatusSummary` under its `HEADING_MARK`, label and `SpreadLine`.
