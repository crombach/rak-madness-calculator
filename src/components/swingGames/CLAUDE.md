# swingGames

The `/:season/:week/swings` route: each open game, with the players it would
knock out on either side, grouped by which team they need, and each final game
with the players it knocked out.

- `SwingGamesRoute`: reads scores from `useScores`, mounted lazily by
  `App.tsx` behind the `swings` path.
- `SwingGames`: reads `useSwingGames`. A week with no swing game, won or not,
  redirects to the scoreboard with `replace`.
  Games sit in All Games' `gameSections`. A game's title opens `useGameStatus`,
  and each side lists its players, a name opening `usePlayerAnalysis`.
- `SwingGamesSkeleton`: the wireframe shown while the route's chunk, or the
  week itself, is still loading.
- `useGridColumns`: how many name columns a side's grid lays out, so a fold
  cuts at whole rows.
