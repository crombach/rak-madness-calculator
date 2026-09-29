# headToHead

The `/:season/:week/compare` route: the points between two players, and the
open games that can still change them.

- `HeadToHeadRoute`: redirects to the scoreboard without the experimental
  opt-in, else renders `HeadToHead`. Mounted lazily by `App.tsx`.
- `HeadToHead`: two `PlayerCombobox` pickers, the first set to the reader's own
  player. `getHeadToHead` gives the gap and verdict. `PicksTable` draws the two
  rows with every tiebreaker, open split games first, decided ones behind
  "Show more".
- `HeadToHeadSkeleton`: the pickers and standing as fills, while the week or
  the page chunk loads. Owns the picker labels, so it never pulls in the page.
