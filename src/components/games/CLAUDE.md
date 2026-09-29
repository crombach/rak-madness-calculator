# games

The `/:season/:week/all-games` route: every game of the week, one scoreboard
each. `/games` and `/live` redirect here.

- `GamesPage`: `lazyPreloadable` over `GamesRoute`, mounted by `App.tsx`.
  `ResultsFrame` preloads it.
- `GamesRoute`: `Games` behind `ExperimentalGate`. A settled week stays.
- `Games`: `useLiveWeek` polls every open league, a busy bar under the caption
  while a live one is fetched. Sections Live, Today, Tomorrow, Upcoming, then
  Completed in table order. An empty section is left out.
- `GameCard`: a `GameStatusSummary` banded with its label, name and `GameMark`.
- `kickoffDay`: a kickoff's day in the reader's time zone.
- `sectionTitles`: each section's title, apart from `Games` for the skeleton.
- `GamesSkeleton`: one section under a blank title, `GameCard`s on a stand-in
  game, text hidden under fills. Also while the week loads.
