# src/types

- `EspnEvent`/`EspnCompetitor`/`GameStatus`: the ESPN scoreboard shapes.
- `League`/`SeasonType`/`WeekInfo`/`LeagueInfo`
- `LeagueResult`/`GameSide`/`Possession`: a game with its event id, each side's
  record, logo, name in halves and the points it scored by period, which is what
  says how many were played, and its venue.
- `WeekGame`/`GameSpread`: one picks column, the game it was picked against, and
  the pool's line on it from the favored side.
- `GameScore`: pick-scoring result.
- `RakMadnessScores`/`PlayerScore`/`PickResult`/`Status`
- `PlayerAnalysis`: a union over knockedOut, clinched, headline, and paths, so a
  summary cannot render a field that was never worked out.
