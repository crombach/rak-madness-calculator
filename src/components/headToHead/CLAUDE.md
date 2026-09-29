# headToHead

The `/:season/:week/compare` route: two players' picks, cut to the games they
picked differently.

- `HeadToHeadRoute`: redirects to the scoreboard without the experimental
  opt-in, else renders `HeadToHead`. Mounted lazily by `App.tsx`.
- `HeadToHead`: two `DialogCombobox` pickers, the first set to the reader's own
  player. `differingGames` picks the columns. `PicksTable` draws the two rows.
