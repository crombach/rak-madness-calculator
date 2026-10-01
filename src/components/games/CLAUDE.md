# games

The `/:season/:week/games` route: every game of the week, one scoreboard
each.

- `GamesPage`: `lazyPreloadable` over `GamesRoute`, mounted by `App.tsx`.
  `ResultsFrame` preloads it.
- `GamesRoute`: `Games` on the week's scores. A settled week stays.
- `Games`: `useLiveWeek` polls every open league, a busy bar under the caption
  while a live one is fetched.
- `gameSections`: Live, Today, Tomorrow, Upcoming, then Completed in table
  order, for both card pages. An empty section is left out.
- `GameCard`: a `GameStatusSummary` banded with its label, name and `GameMark`.
- `kickoffDay`: a kickoff's day in the reader's time zone.
- `sectionTitles`: each section's title, apart from `Games` for the skeleton.
- `SectionTitle`: a section's heading, its game count in a chip, on both card
  pages.
- `GamesSkeleton`: one section under a blank title and count, `GameCard`s on a
  stand-in game, text hidden under fills. Also while the week loads.
- `standInGame`: that stand-in game, for both card pages' skeletons.
