# comparePlayers

The `/:season/:week/compare` route: two or more players' points, and the open
games that can still change them.

- `ComparePlayersRoute`: redirects to the scoreboard without the experimental
  opt-in, else renders `ComparePlayers`. Mounted lazily by `App.tsx`.
- `ComparePlayers`: a `PlayerCombobox` per player, added and removed by the
  reader, two at least. `getComparison` gives the leader and each verdict.
  `PicksTable` draws the rows with every tiebreaker, on split games or all.
- `comparedPlayers`: the chosen names in `settingsStore`, restored by name.
- `ComparePlayersSkeleton`: the pickers and standing as fills, while the week or
  the page chunk loads. Also exports `AddButton`, which it draws too.
