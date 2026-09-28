# Navbar menu

Add a hamburger menu to the navbar. It is where every feature that is not a view
of one week opens from, so later features add an item here rather than a navbar
button. The season leaderboard in [`season-leaderboard.md`](season-leaderboard.md)
is the first such feature, and it depends on this menu.

## Design

- Add `src/components/navbar/NavMenu.tsx`. It is a Base UI `Menu.Root` whose
  trigger is a compact `Button` holding a new `MenuIcon`.
- Base UI 1.8 ships `Menu`, but nothing in `src/` uses it yet. `DialogShell` is the
  wrong fit for this, because it takes over the screen with a title bar and a
  backdrop.
- Copy the Material Symbols Sharp "menu" glyph at weight 400 into
  `src/components/icon/Icon.tsx` as `MenuIcon`, the same way the other icons are
  copied.
- Each item is a `Menu.LinkItem` that goes to a route. Keep the items in one list
  in `NavMenu.tsx`, so a new feature adds one entry and nothing else.
- Ship the menu with the first feature that needs it, never empty. "Season
  leaderboard" is the first item planned.
- Style the popup with `--rak-*` tokens in `NavMenu.scss`. Reuse the listbox mixin
  in `src/styles/` where it fits.

## Placement

- `ResultsFrame` mounts `NavMenu` after `ScoresNavbar`, in the navbar's right slot.
- Any page outside `/:season/:week` mounts it in the same place, so the trigger does
  not move between pages.
- Below the `labeled-navbar` breakpoint the navbar shows icons only. The trigger
  needs an accessible name such as "Menu" on every width.

## Verification

- A test opens the menu and follows an item to its route.
- Arrow keys move between items, and Escape closes the menu and returns focus to
  the trigger. Base UI provides both, so the test only confirms them.
- Screenshot the open menu on a phone width and a wide width with the `record-demo`
  skill.
