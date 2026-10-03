# comparePlayers

The `/:season/:week/compare` route: two to ten players' picks in one table,
plus the week's leader when shown.

- `ComparePlayersRoute`: `ComparePlayers` behind `ExperimentalGate`.
- `ComparePlayersPage`: `lazyPreloadable` over `ComparePlayersRoute`, mounted
  by `App.tsx`.
- `ComparePlayers`: `PicksTable` with every tiebreaker, on every game or only
  the `differingGames` or `sameGames`. With fewer than two players chosen, it
  opens the dialog over a `SkeletonTable`.
- `ComparePlayersDialog`: a `PlayerCombobox` per player, added and removed by
  the reader.
- `comparedPlayers`: the chosen names, the game scope, and the leader toggle in
  `settingsStore`, names restored by name in any case. A name the week
  lacks stays, struck through in its picker and drawn as an N/A row.
- `ComparePlayersSkeleton`: the controls over a `SkeletonTable`, while the week
  or the page chunk loads.
- `ComparePlayersControls`: `ChooseButton` and `LeaderToggle` in a Players
  `ControlGroup`, then `GamesToggle`, drawn by the page and its skeleton.
