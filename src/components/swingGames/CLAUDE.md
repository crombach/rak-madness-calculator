# swingGames

The `/:season/:week/swings` route: each open game, with the players it would
knock out on either side, grouped by which team they need.

- `SwingGamesRoute`: reads scores from `useScores`, mounted lazily by
  `App.tsx` behind the `swings` path.
- `SwingGames`: reads `useSwingGames`. A week with no swing game, won or not,
  or a reader without the opt-in, redirects to the scoreboard with `replace`.
  Each open game is a section: its title opens `useGameStatus`, and each side
  lists the players it would knock out, a name opening `usePlayerAnalysis`.
- `SwingGamesSkeleton`: the wireframe shown while the route's chunk, or the
  week itself, is still loading. It shows the intro line too, whose
  text lives in `swingGamesIntro`.
- `useGridColumns`: how many name columns a side's grid lays out, so a fold
  cuts at whole rows.
