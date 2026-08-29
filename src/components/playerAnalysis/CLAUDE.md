# playerAnalysis

Where a player stands in a week and what they must still do to win it, opened from
their name in either table.

- `PlayerAnalysisDialog`: `DialogShell` over a `DialogCombobox`. `matching` offers
  every player the typed letters reach. Entries and input carry
  `PlayerStatusIcon`. `useArrival` takes a name handed in from a table.
- `PlayerAnalysisDialog.scss`: the status hues alone. Everything else about the look
  comes from `components/dialog/`.
- `AnalysisSummary`: the standing above the body. Decides once whether the week
  is done, for both halves.
- `analysisParts`: `Section`, `Picks`, `Message`, the pieces with no analysis
  logic of their own, shared by the three files below.
- `mondayNight`: the MNF Points tiebreaker, its sentence and its route line.
- `AnalysisRoutes`: the paths list, folded until asked to show more.
- `AnalysisBody`: the switch on `PlayerAnalysis.kind` that picks what to render.
- `Standing`: where the picked player stands, read off the scores, so it shows
  while their routes are worked out.
