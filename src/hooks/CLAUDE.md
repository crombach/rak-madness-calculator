# hooks

The data layer, plus the page measurements. The first four mount once in
`AppDataContext`, above the routes.

- `usePicksSeasons`: the weeks with picks, by season, from `/api/picks`
- `useCurrentSeason`: the season running now, once it starts
- `useLeagueWeeks`: the season's ESPN weeks, and which is selected
- `usePlayerScores`: a week's scores, and the one refresh. `refresh` rereads the
  sheet and both leagues, `rescore` the named leagues, scoring only where a game
  moved
- `useLiveGame`: a game, `onPoll` on its league every twenty seconds past kickoff
- `useArrival`: an outside value, taken as it arrives
- `useWarmTeamLogos`: the week's logos, fetched before a game is opened
- `useMediaQuery`: whether a media query holds, kept in step
- `usePullToRefresh`: a phone's pull on a scrolling box, written to the root
- `useExportScores`: the scores, as a workbook
- `useWeekRouteGuard`: whether a `/:season/:week` URL has anything to show
- `useFillerRows`: the empty rows carrying a table to the viewport bottom
- `useViewportInsets`: what a keyboard covers, as root properties
- `useShowPlayerStatus`: whether the tables may say where a player stands
