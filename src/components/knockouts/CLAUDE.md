# knockouts

The `/:season/:week/knockouts` route: each open game, with the players it would
knock out on either side, grouped by which team they need, and each final game
with the players it knocked out.

- `KnockoutsRoute`: behind `ExperimentalGate`, hands `Knockouts` the scores,
  `useKnockouts`, `rescore` and `fetchingLeagues`.
- `KnockoutsPage`: `lazyPreloadable` over `KnockoutsRoute`, mounted by `App.tsx`.
- `Knockouts`: polls as `Games` does, and draws its busy bar. A week with no
  game to show, settled or not, redirects to the scoreboard with `replace`.
  Its games are grouped by `gameSections`, as on Games.
- `KnockoutCard`: one game to a row. Its band opens `useGameStatus`. Each side
  lists its players. An open game's names open `usePlayerAnalysis`. The sides sit beside
  each other once both fit. A pick side keeps those behind on total. A
  tiebreaker knockout goes under its tier's side, whatever the pick did.
- `KnockoutsSkeleton`: `KnockoutCard`s on a stand-in game, text hidden under
  fills, while the route's chunk or the week loads.
- `useGridColumns`: how many name columns a side's grid lays out, so a fold
  cuts at whole rows.
