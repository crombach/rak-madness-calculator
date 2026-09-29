# comparePlayers

The `/:season/:week/compare` route: two to eight players' picks in one table.

- `ComparePlayersRoute`: redirects to the scoreboard without the experimental
  opt-in, else renders `ComparePlayers`. Mounted lazily by `App.tsx`.
- `ComparePlayers`: `PicksTable` with every tiebreaker, on the players'
  `differingGames` or all.
- `ComparePlayersDialog`: a `PlayerCombobox` per player, added and removed by
  the reader.
- `comparedPlayers`: the chosen names in `settingsStore`, restored by name.
- `ComparePlayersSkeleton`: the controls over a `SkeletonTable`, while the week
  or the page chunk loads. Exports `ChooseButton` and `GamesToggle`, which it
  draws too.
