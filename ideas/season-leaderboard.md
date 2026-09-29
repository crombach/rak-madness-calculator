# Season leaderboard

The season leaderboard is on hold. Scoring a week costs more CPU than a Cloudflare
Pages Function gets on the free plan. Choose where the scoring runs before you
build anything else here. The design below holds whichever option you pick.

## What it shows

The page follows the official standings board at
[rakmadness.net/standings-pickem](https://rakmadness.net/standings-pickem/).

- It has one row per player. The columns are Rank, Player, `Wk 1` through `Wk N`,
  and Total.
- A week cell holds the player's total score for that week. Total is the sum of the
  weeks.
- Every week of the season has a column, including weeks not played yet. The week
  list is the ESPN calendar's weeks together with every week that has a stored
  sheet.
- A week with no score leaves its cell empty and muted. The official board shows 0
  there, but a 0 reads as a score.
- A week still being played shows its live score. Its header carries the red
  `.table__live-dot` and a screen-reader "Live", the same mark `PicksTable` gives a
  live game.
- A week's winners get `EmojiEventsIcon` in their cells. The official board has no
  such mark.

## Choosing where scoring runs

| Option                    | Cost                      | Tradeoff                                                                                |
| ------------------------- | ------------------------- | --------------------------------------------------------------------------------------- |
| GitHub Actions cron       | Free for this public repo | Runs start minutes late, and GitHub disables the schedule after 60 days with no commits |
| Browser scores every week | Free                      | Each reader's first load fetches about 1.7 MB from ESPN per week                        |
| Workers Paid              | $5 a month                | Allows 30 s of CPU per request, so the Function design works as it is                   |

The Actions cron fits best. A scheduled workflow runs a Node script that calls
`getPlayerScores` for each finished week. The script writes the summary to R2 at
`scores/<season>/<week>.json` with a Cloudflare API token held as a repo secret.
A Function then only serves stored JSON, which costs almost no CPU. The browser
scores the live week itself with the code it already runs for one week.

## Design

### Week summary

Add `src/utils/scoring/summarizeWeek.ts`. It turns `RakMadnessScores` into this:

```ts
type WeekSummary = {
  version: number;
  week: number;
  picksEtag: string;
  isLive: boolean;
  players: Array<{ name: string; total: number; isWinner: boolean }>;
};
```

- `isLive` stays true until every game in `scores.games` is `GameStatus.FINAL`.
  That is the rule `isWeekOver` in `src/hooks/useLiveWeek.ts` uses. Move it to a
  util so both callers share it.
- `isWinner` is set once `isWeekSettled` passes. It marks every row that
  `compareOnMerit` in `src/utils/scoring/comparePlayerScores.ts` ties with row 0.
- A stored summary is stale when its `picksEtag` differs from the sheet's R2 etag,
  or when its `version` differs from a `SUMMARY_VERSION` constant. Raise that
  constant whenever a scoring rule changes.

### Season table

- `src/utils/buildSeasonLeaderboard.ts` merges the summaries into rows. It matches
  a player across weeks by the trimmed, case-folded name, and shows the most recent
  spelling. Rows sort by total, then by name, as `comparePlayerScores` breaks ties.
- `src/components/table/season/SeasonTable.tsx` builds on `TableShell` and
  `RankCell`, with the sticky `PLAYER_COL_CLASS` column.
- A live week's header reuses `HEADING_MARK` from `picks/headingMark.tsx`, which
  any table can import.

### Route

- The route is `/:season/leaderboard`, with a `leaderboardPath(season)` helper in
  `src/components/results/resultsPath.ts`. React Router ranks the static segment
  above `/:season/:week`.
- Add a "Season leaderboard" item to the navbar menu, which opens the page.

## CPU cost of one week

The free plan allows 10 ms of CPU per request. These are Node measurements for one
week of the 2025 season:

| Step                                       | CPU                       |
| ------------------------------------------ | ------------------------- |
| Parse the picks sheet with `xlsx-js-style` | 4.4 ms warm, 22.6 ms cold |
| Parse the college results JSON, 843 KB     | 3.5 ms                    |
| Parse the college calendar JSON, 4.5 MB    | 12.2 ms                   |
| Parse the pro calendar JSON, 829 KB        | 4.2 ms                    |
| Score the parsed week                      | about 1.2 ms              |

Caching the calendars still leaves a warm week near 9 ms, and a cold isolate goes
well past 10 ms.

## Running the scoring path in a Worker

A Worker, or a Node script outside Vite, needs these changes first:

- `src/utils/debugLog.ts` reads `import.meta.env.DEV`. Wrangler's bundler leaves
  `import.meta.env` undefined, so the module throws when it loads.
- `src/utils/localStorageCache.ts` calls `localStorage`, which a Worker lacks. The
  `ReferenceError` is caught, but it logs a warning on every read.
- `xlsx-js-style` calls `require("stream")`, which needs the `nodejs_compat`
  compatibility flag in a Worker.
- `functions/tsconfig.json` would need `vite/client` in `types` to typecheck the
  imported `src/` files.
