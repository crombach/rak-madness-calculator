# hooks

The data layer, plus the two page measurements. The first four mount once in
`AppDataContext`, above the routes.

- `usePicksSeasons`: the seasons with picks, from `/api/picks`, newest first
- `useCurrentSeason`: the season running now, once it starts
- `useLeagueWeeks`: the season's ESPN weeks, and which is selected
- `usePlayerScores`: a week's scores from the API, cache, or an upload. Owns
  the throttle
- `useLiveGame`: one game, refetched every twenty seconds
- `useArrival`: an outside value, taken as it arrives
- `useWarmTeamLogos`: the week's logos, fetched before a game is opened
- `useMediaQuery`: whether a media query holds, kept in step
- `usePullToRefresh`: a phone's pull on a scrolling box, written to the root
- `useExportScores`: the scores, as a workbook
- `useWeekRouteGuard`: whether a `/:season/:week` URL has anything to show
- `useFillerRows`: the empty rows carrying a table to the viewport bottom
- `useViewportInsets`: what a keyboard covers, as root properties
- `useShowPlayerStatus`: whether the tables may say where a player stands
