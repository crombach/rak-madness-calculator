# scoring

The picks-to-scoreboard pipeline, sequenced by `getPlayerScores`.

- `parsePicksWorkbook`: xlsx buffer to rows, keys, matchups
- `parsePick`: a cell to team and spread
- `validateSpreads`: rows disagreeing on spread
- `marginAgainstSpread`: a side's margin, spread applied
- `getPickResults`: picks scored, plus `getStatus`. One answer per cell
  text, held against the week's index
- `resultsIndex`: a week by team and by matchup, built once
- `gameColumns`: `LEAGUES`, `LEAGUE_PREFIX`, `gameLabels`
- `weekGames`: each column, game and line
- `getTiebreakerScore`: the Monday night total
- `scorePlayers`: per-player totals, sorted
- `comparePlayerScores`: rank order, on merit, over a `Merit` the search
  fills from numbers
- `isWinnerDecided`: whether knockouts settled it
- `weekShape`: open games, holes, and whether the week ran out. One walk per
  set of rows
- `remainingGames`: the open games
- `unscoreableGames`: games nobody scores
- `applyKnockouts`: who can still win, why not. A blank pick means a forgetful
  player or a name added to cover a game, so it cannot win
- `scoreChanges`: what a refresh changed
- `getPlayerAnalysis`: what a player must do, plus `getSettledAnalysis`,
  the answers a week already holds, which the dialog asks before it waits
- `leagueResultFixtures`: test game builders
- `benchFixtures`: the 80x22 worst week the benchmarks measure, every game
  picked
