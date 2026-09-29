---
name: glossary
description: One name per concept in this app, in UI text and in code. Load before naming a type, function, route, UI label, toast, or doc term, and before renaming any of them.
---

# Glossary

One concept, one name. Reader means the person viewing, in prose and comments. Never "user".

## Names

| Concept                     | UI word           | Code word                                                                     | Never                            |
| --------------------------- | ----------------- | ----------------------------------------------------------------------------- | -------------------------------- |
| Pool member                 | player            | `player`, `name`                                                              | user                             |
| One player's call on a game | pick              | `pick`                                                                        | bet, vote                        |
| One football game           | game              | `game`                                                                        | matchup                          |
| Two teams as an index key   | none              | `matchup`, `matchupKey` in `getLeagueResults.ts`                              | a game                           |
| Pool week                   | week              | `week` (`WeekInfo`), `weekNumber`, `weekParam`                                | round                            |
| Year of the pool            | season            | `season`                                                                      | year                             |
| Ranked table page           | Scoreboard        | route `scoreboard`, `ScoresTable`, `ScoreboardRoute`, xlsx sheet "Scoreboard" | standings, leaderboard, rankings |
| Every game of a week        | All Games         | route `all-games` (old `games` and `live` redirect), `Games*`                 | Live Games                       |
| Games that move the ranking | Swing Games       | route `swings`, `SwingGames*`                                                 | swings, upsets                   |
| Monday night points guess   | MNF Points        | `tiebreaker`                                                                  | tiebreak                         |
| Spreadsheet column for it   | Pts               | column header only                                                            |                                  |
| Point spread                | spread            | `spread`                                                                      | line                             |
| Against the spread          | ATS               | `proAgainstTheSpread`                                                         |                                  |
| Uploaded picks file         | picks spreadsheet | `workbook`                                                                    |                                  |
| Where picks persist         | picks store       | R2 bucket behind `/api/picks`                                                 | database                         |
| NFL or college              | league            | `League` enum                                                                 | pool                             |
| The Rak Madness group       | pool              | none                                                                          | league                           |
| Finished week               | Week complete     | `settled`                                                                     | done, over                       |
| Per-player win analysis     | Player Analysis   | `playerAnalysis`, `PlayerAnalysis*`                                           |                                  |

The "Player rankings" caption on the Scoreboard table is the screen-reader name. Keep it.

## Overloaded words

Use each word for its one meaning.

| Word       | Only meaning                                                                                                  |
| ---------- | ------------------------------------------------------------------------------------------------------------- |
| results    | `LeagueResult`: one ESPN game result. `ResultsFrame` and `ResultsLayout`: the shell of the week pages.        |
| scoreboard | Prose and route: the ranked table. `Scoreboard` type in `getLeagueInfo.ts`: the ESPN scoreboard API response. |
| scores     | A player's points. `RakMadnessScores` holds them.                                                             |
| points     | Pick points on the Scoreboard. Game points are the game's score.                                              |
| live       | A game in progress. Exception: the setting "Live Player Analysis". Name it whole.                             |
| standings  | The footer link "Standings" to rakmadness.net. Nowhere else in the UI.                                        |
| upcoming   | `GameStatus.UPCOMING`: not started. Section "Upcoming": kickoff later than tomorrow. Say which.               |

## Frozen names

Renaming costs a data migration. Never rename the keys and enum values below.

- R2 keys `picks/{season}/{week}.xlsx`
- localStorage keys `rak-madness:*`
- `League` enum values `nfl` and `college-football`
