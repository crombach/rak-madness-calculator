# navbar

- `Navbar`: `<header>` with `left`/`right` `ReactNode` slots, solid primary fill.
  `.navbar__divider` marks a group split, reused by `ScoresNavbar` and `NavMenu`.
- `ScoresNavbar`: the results routes' scoreboard/picks switch, led by a live
  week's refresh. Clearing `isWeekLive` fades refresh and its divider out,
  then unmounts them.
- `NavMenu`: the hamburger every page mounts, opt-in gated, to "Home" and
  "Swing Games". A wide-screen popup, a drawer with the same items below it.
  Every item always shows. `ITEMS` disables one, its reason a popup tooltip.
- `LogoButton`: `APP_NAME`, which it exports, as a target that goes home, used
  by the results frame and the home page too, set in `--rak-font-display`.

Nothing here opens the player analysis. A player's name does, in either table.
