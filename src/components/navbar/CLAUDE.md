# navbar

- `AppNavbar`: `PageLayout` with the logo, `ScoresNavbar` and `NavMenu`, for
  the home page and `ResultsFrame`.
- `Navbar`: `<header>` with `left`/`right` `ReactNode` slots, solid primary fill.
  `.navbar__divider` marks a group split, reused by `ScoresNavbar` and `NavMenu`.
- `ScoresNavbar`: the results routes' scoreboard/picks switch, led by a live
  week's refresh. Clearing `isWeekLive` fades refresh and its divider out,
  then unmounts them.
- `NavMenu`: the hamburger every page mounts. `ITEMS`, less Compare Players
  without the opt-in, then Settings opening `SettingsDialog`. A wide-screen popup, a
  drawer below it. `ITEMS` disables, never hides, an item. Its reason sits
  under its name.
- `LogoButton`: `APP_NAME`, which it exports, as a target that goes home, set
  in `--rak-font-display`.

Nothing here opens the player analysis. A player's name does, in either table.
