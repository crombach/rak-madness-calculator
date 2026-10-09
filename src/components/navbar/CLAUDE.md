# navbar

- `AppNavbar`: the layout route above every page. One `PageFrame` with the
  logo, `ScoresNavbar` and `NavMenu`, mounted across every route change. A page
  sets the bar through `useAppNavbar`, before paint and only on a change.
- `Navbar`: `<header>` with `left`/`right` `ReactNode` slots, solid primary fill.
  `.navbar__divider` marks a group split, reused by `ScoresNavbar` and `NavMenu`.
- `ScoresNavbar`: the results routes' scoreboard/picks switch, led by a live
  week's refresh. Clearing `isWeekLive` fades refresh and its divider out,
  then unmounts them.
- `NavMenu`: the hamburger every page mounts. Every `ITEMS` entry, then Settings
  opening `SettingsDialog`. Compare Players shows only with experimental
  features on. A drawer on a touch screen, a popup elsewhere. An item
  that does not apply is disabled, never hidden. Its reason sits under its name.
- `LogoButton`: `APP_NAME`, which it exports, as a target that goes home, set
  in `--rak-font-display`.

Nothing here opens the player analysis. A player's name does, in either table.
