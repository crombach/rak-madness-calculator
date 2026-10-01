# swingGames

The `/:season/:week/swings` route: each open game, with the players it would
knock out on either side, grouped by which team they need, and each final game
with the players it knocked out.

- `SwingGamesRoute`: hands `SwingGames` the scores, `useSwingGames` and
  `rescore`, mounted lazily by `App.tsx` behind the `swings` path.
- `SwingGames`: polls as `Games` does, and draws its busy bar. A week with no
  swing game, won or not, redirects to the scoreboard with `replace`.
  Games sit in All Games' `gameSections`. A game's title opens `useGameStatus`,
  and each side lists its players, a name opening `usePlayerAnalysis`.
- `SwingGamesSkeleton`: the wireframe shown while the route's chunk, or the
  week itself, is still loading.
- `useGridColumns`: how many name columns a side's grid lays out, so a fold
  cuts at whole rows.
