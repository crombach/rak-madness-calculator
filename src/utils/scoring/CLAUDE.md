# scoring

The picks-to-scoreboard pipeline, sequenced by `getPlayerScores`.

- `parsePicksWorkbook`: xlsx buffer to rows, keys, matchups
- `parsePick`: a cell to team and spread
- `validateSpreads`: rows disagreeing on spread
- `marginAgainstSpread`: a side's margin, spread applied
- `getPickResults`: picks scored, plus `getStatus`
- `resultsIndex`: a week by team and by matchup, built once
- `gameColumns`: `LEAGUES`, `LEAGUE_PREFIX`, `gameLabels`
- `weekGames`: each column, game and line
- `getTiebreakerScore`: the Monday night total
- `scorePlayers`: per-player totals, sorted
- `comparePlayerScores`: rank order, on merit
- `isWinnerDecided`: whether knockouts settled it
- `weekShape`: open games, holes, and whether the week ran out
- `remainingGames`: the open games
- `unscoreableGames`: games nobody scores
- `isEveryGameSettled`: whether the week finished
- `applyKnockouts`: who can still win, why not
- `scoreChanges`: what a refresh changed
- `getPlayerAnalysis`: what a player must do, plus `getSettledAnalysis`,
  the answers a week already holds, which the dialog asks before it waits
- `leagueResultFixtures`: test game builders
- `benchFixtures`: the 60x19 week the benchmarks measure
