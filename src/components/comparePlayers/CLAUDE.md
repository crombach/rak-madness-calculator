# comparePlayers

The `/:season/:week/compare` route: one to ten players' picks in one table,
plus the week's leader when shown.

- `ComparePlayersRoute`: `ComparePlayers` behind `ExperimentalGate`.
- `ComparePlayersPage`: `lazyPreloadable` over `ComparePlayersRoute`, mounted
  by `App.tsx`.
- `ComparePlayers`: `PicksTable` with every tiebreaker, on every game or only
  the `differingGames` or `sameGames`. With no player or leader to show, it
  opens the dialog over a `SkeletonTable`.
- `ComparePlayersDialog`: a `PlayerCombobox` per player, added and removed by
  the reader.
- `useStatus`: a `role="status"` message that speaks again when repeated.
- `useArmed`: a key that loses data acts on its second press.
- `ComparePresetsDialog`: the saved presets, each loaded, renamed or deleted,
  and a new one saved from the players chosen.
- `comparedPlayers`: the chosen names, the presets, the game scope, and the
  leader toggle in `settingsStore`, names restored by name in any case. A name the week
  lacks stays, struck through in its picker and drawn as an N/A row.
- `ComparePlayersSkeleton`: the controls over a `SkeletonTable`, while the week
  or the page chunk loads.
- `ComparePlayersControls`: `PlayersGroup`, Choose, Presets and
  `LeaderToggle`, then `GamesToggle`, drawn by the page and its skeleton.
