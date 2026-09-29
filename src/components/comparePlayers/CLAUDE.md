# comparePlayers

The `/:season/:week/compare` route: two to eight players' picks in one table.

- `ComparePlayersRoute`: redirects to the scoreboard without the experimental
  opt-in, else renders `ComparePlayers`. Mounted lazily by `App.tsx`.
- `ComparePlayers`: a `PlayerCombobox` per player, added and removed by the
  reader. `getComparison` finds the games they split. `PicksTable` draws the
  rows with every tiebreaker, on those games or all.
- `comparedPlayers`: the chosen names in `settingsStore`, restored by name.
- `ComparePlayersSkeleton`: the pickers and prompt as fills, while the week or
  the page chunk loads. Also exports `AddButton`, which it draws too.
