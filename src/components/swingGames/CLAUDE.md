# swingGames

The `/:season/:week/swings` route: each open game, with the players it would
knock out on either side, grouped by which team they need, and each final game
with the players it knocked out.

- `SwingGamesRoute`: behind `ExperimentalGate`, hands `SwingGames` the scores,
  `useSwingGames`, `rescore` and `fetchingLeagues`, mounted lazily by `App.tsx` behind `swings`.
- `SwingGames`: polls as `Games` does, and draws its busy bar. A week with no
  game to show, settled or not, redirects to the scoreboard with `replace`.
  Its games are grouped by `gameSections`, as on All Games.
- `SwingGameCard`: one game to a row. Its band opens `useGameStatus`. Each side
  lists its players, a name opening `usePlayerAnalysis`. The sides sit beside
  each other once both fit.
- `SwingGamesSkeleton`: `SwingGameCard`s on a stand-in game, text hidden under
  fills, while the route's chunk or the week loads.
- `useGridColumns`: how many name columns a side's grid lays out, so a fold
  cuts at whole rows.
