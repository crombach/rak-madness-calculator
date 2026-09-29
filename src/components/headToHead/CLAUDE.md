# headToHead

The `/:season/:week/compare` route: the points between two players, and the
open games that can still change them.

- `HeadToHeadRoute`: redirects to the scoreboard without the experimental
  opt-in, else renders `HeadToHead`. Mounted lazily by `App.tsx`.
- `HeadToHead`: two `PlayerCombobox` pickers, the first set to the reader's own
  player. `getHeadToHead` gives the gap and verdict. `PicksTable` draws the two
  rows with every tiebreaker, open split games first, decided ones behind
  "Show more".
