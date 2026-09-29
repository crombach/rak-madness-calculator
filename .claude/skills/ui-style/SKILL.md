---
name: ui-style
description: How this app styles a view - which token, mixin, or class each piece of information and each UI state uses, and how to check the result. Load before styling any view, adding a component, or reviewing a UI diff.
---

# UI style

The same information is shown the same way everywhere. Before styling a view, find
how an existing view shows the same information, and reuse that rule. Never invent a
new style for something the app already renders elsewhere. UI words: `glossary` skill.

## Information and its style

| Information                                     | Rule                                                                                                                                                                                                                          | Source                                                              |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| Game ID ("P3")                                  | `pick-label`: `--rak-text-tertiary`, bold. In a combobox input, through `DialogCombobox`'s `renderValue`, since an input's own text takes no style                                                                            | `src/styles/_picks.scss`                                            |
| Pick with spread ("KC -3")                      | `pick-face`: IBM Plex Mono, `--rak-weight-semibold`, `--rak-text-sm`, in `--rak-text`. Never LCD                                                                                                                              | `src/styles/_picks.scss`                                            |
| Matchup ("KC @ DEN")                            | `pick-face`, same as a pick. Game ID beside it adds `pick-type` to `pick-label`. A team abbreviation anywhere is `pick-face` in `--rak-text`, never the body face. A count line such as "Pool: 1 KC -3" follows the same rule | `src/styles/_picks.scss`                                            |
| Player name                                     | `player-name-face`, at `--rak-text-cells`. The reader's own name adds `my-player-name` and `--rak-my-row-accent`. Truncate with `truncate-line`                                                                               | `src/styles/_text.scss`                                             |
| Live and delayed game marks                     | `live-dot` (`src/styles/_ink.scss`) and `HEADING_MARK` (`src/components/table/picks/headingMark.tsx`). Mark sits left of the game ID. Its word goes in the accessible name                                                    | both files above                                                    |
| Where a game stands, as a pill (`LIVE`, `SOON`) | `GameMark`, at the end of the game's line. The Game Status search and every game card. Never a bare `live-dot` there                                                                                                          | `src/components/gameStatus/GameMark.tsx`                            |
| Left rule blocks                                | `ruled-block($rule)`: `$rule-required` (red, must-win), `$rule-option` (gold, routes and pools), `$rule-alive` (blue, players still in contention)                                                                            | `src/styles/_picks.scss`                                            |
| Small tracked capitals                          | `micro-label`                                                                                                                                                                                                                 | `src/styles/_label.scss`                                            |
| Counts ("13 players", "3 games remaining")      | `plural` and `verbFor`. Never an inline singular/plural switch                                                                                                                                                                | `src/utils/plural.ts`                                               |
| Fold toggles                                    | Text "Show More" / "Show Fewer", `fold-toggle` mixin. Fold at whole rows                                                                                                                                                      | `src/styles/_fold.scss`                                             |
| Bands and section headers                       | `--rak-band-header` fill, `--rak-on-solid` ink. Every card band, swing groups included, takes `--rak-band-card`                                                                                                               | `src/index.scss`                                                    |
| Page body (not a table)                         | `page-body` mixin                                                                                                                                                                                                             | `src/styles/_page.scss`                                             |
| Game card                                       | `game-card-frame`, `game-card-band`: label, matchup, then `GameMark` at the band end, on All Games and Swing Games alike                                                                                                      | `src/styles/_page.scss`                                             |
| Heading over a block or list                    | `section-title(sm)` or `section-title(xs)`, ink `--rak-text-secondary`. Builds on `micro-label`                                                                                                                               | `src/styles/_label.scss`                                            |
| No data                                         | `EmptyState`, `<p role="status">`                                                                                                                                                                                             | `src/components/pageLayout/EmptyState.tsx`                          |
| Failure                                         | Toast. A results page whose scores failed adds `EmptyState`, a Retry `Button` and a Home one                                                                                                                                  | `useToastActions`, `src/components/results/ResultsFrame.tsx`        |
| Loading wireframe                               | `inert`, `aria-hidden`, beside a `SkeletonStatus`                                                                                                                                                                             | `src/components/pageLayout/SkeletonStatus.tsx`                      |
| Control height                                  | `--rak-control-sm` (2.25rem), `--rak-control-lg` (3.5rem). No literal                                                                                                                                                         | `src/index.scss`                                                    |
| Hover and press fill                            | `interactive-fill($hover, $press, $also-pressed)`. Hand-written `:hover`/`:active` fills are wrong                                                                                                                            | `src/styles/_interactive.scss`                                      |
| Dialog insets                                   | `--rak-dialog-pad`, `--rak-dialog-max-height`. Section column: `dialog-column`. Flex column: `stacked($gap)`                                                                                                                  | `src/components/dialog/DialogShell.scss`, `src/styles/_layout.scss` |
| Dividers                                        | `--rak-divider-strong` between blocks and under a dialog header. `--rak-divider-soft` between rows of one block                                                                                                               | `src/index.scss`                                                    |
| Ink on a fill fixed in both themes              | `--rak-ink-fixed-light`                                                                                                                                                                                                       | `src/index.scss`                                                    |

## States and chrome

- Disabled items keep their normal background. Fade text and icon only. No hover or
  press fill. `cursor: not-allowed` inside `can-hover`. Ink `--rak-disabled-text`, or on
  the navbar fill, `--rak-nav-ink` at 70%.
- Give a disabled item's reason as a smaller line under its name, aligned with
  it, at every width. Also its `aria-describedby`. No tooltips.
- A disabled item gives no reason while scores or picks load, or once the week
  is settled. Otherwise it says why, such as "Needs two players".
- Button text in title case: "Choose Players", "Show More". Not an icon button's
  `aria-label`, which no one sees.
- One line of separate facts splits them with `·`. The items of one list split
  with a comma. Never a `·` inside a list.
- A loading placeholder for a view one component draws is that component on
  stand-in data, its text hidden under `skeleton-surface` fills, so it takes the
  loaded size. `GamesSkeleton` is the model.
- Hover only inside `can-hover`. Every interactive element gets `focus-ring` and a
  minimum `--rak-touch-target`.
- Navbar dividers use `--rak-on-solid`, as `.navbar__divider` does. Inside a popup
  list, rows split in the popup's edge color and width, `--rak-panel-border` hairline.
  Everywhere else, see Dividers above.
- Menu rows, popup and drawer alike: one `nav-menu-row` mixin
  (`src/components/navbar/NavMenu.scss`). Plain full-width rows, never the bar's
  LED keys.
- Spacing: `--rak-space-2` inside a block, `--rak-space-4` between blocks. Even gaps.
  Real spaces or `gap`, never a margin standing in for one. Half and 1.5 steps:
  `--rak-space-half`, `--rak-space-1-5`.
- Page anatomy: navbar, a visually hidden `<h1>` (`.page__title`), the caption
  `View · Week` on every results page, then the page body.
- Redirect a reader without the experimental opt-in only through `ExperimentalGate`.
- Literal sizes allowed: `1px` hairlines, safe-area `env()`, `em` gaps that scale
  with font, `--rak-block-inset`, table row heights. Any other literal becomes a token.
- Navbar height: `--rak-navbar-height`. Below `short-screen`, the mixin in
  `src/styles/_breakpoints.scss`.
- No class borrowed across components. A rule two components share lives in
  `src/styles/` as a mixin.
- LCD styles (`src/styles/_lcd.scss`): `lcd-glass` only for the scoreline and the
  navbar name, `lcd-field` only for a text input or select well. Never for a pick,
  a label, or a heading.
- Color reaches 4.5:1 for text, 3:1 for shapes carrying meaning, in both themes.
  Check each token's dark-theme value separately.

## Checking work

1. Screenshot at 360px as a touch phone: `record-demo` skill,
   `--touch --device-scale-factor 3`. Confirm the refresh button is hidden.
2. Also screenshot at 1280px. Both sizes in light and in dark, before and after
   your change.
3. Run `make setup` first. Without it, fonts fall back.
4. Cases the screenshots must show: a live game, the reader's own player, a long
   name, a folded list.
5. Compare against the same information in the player analysis dialog and the Game
   Status dialog.
6. Measure alignment and spacing in the browser, not by eye.
