---
name: ui-style
description: How this app styles a view - which token, mixin, or class each piece of information and each UI state uses, and how to check the result. Load before styling any view, adding a component, or reviewing a UI diff.
---

# UI style

The same information is shown the same way everywhere. Before styling a view, find
how an existing view shows the same information, and reuse that rule. Never invent a
new style for something the app already renders elsewhere.

## Information and its style

| Information                                | Rule                                                                                                                                                                       | Source                                               |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| Game ID ("P3")                             | `pick-label`: `--rak-text-tertiary`, bold                                                                                                                                  | `src/styles/_picks.scss`                             |
| Pick with spread ("KC -3")                 | `pick-face`: IBM Plex Mono, `--rak-weight-semibold`, `--rak-text-sm`, in `--rak-text`. Never LCD                                                                           | `src/styles/_picks.scss`                             |
| Player name                                | `player-name-face`, at `--rak-text-cells`. The reader's own name adds `my-player-name` and `--rak-my-row-accent`. Truncate with `truncate-line`                            | `src/styles/_text.scss`                              |
| Live and delayed game marks                | `live-dot` (`src/styles/_ink.scss`) and `HEADING_MARK` (`src/components/table/picks/headingMark.tsx`). Mark sits left of the game ID. Its word goes in the accessible name | both files above                                     |
| Left rule blocks                           | `ruled-block($rule)`: `$rule-required` (red, must-win), `$rule-option` (gold, routes and pools), `$rule-alive` (blue, players still in contention)                         | `src/styles/_picks.scss`                             |
| Small tracked capitals                     | `micro-label`                                                                                                                                                              | `src/styles/_label.scss`                             |
| Counts ("13 players", "3 games remaining") | `.analysis__standing` rule. Use `plural` and `verbFor` from `src/utils/plural.ts`. Never an inline singular/plural switch                                                  | `src/components/playerAnalysis/AnalysisSummary.scss` |
| Fold toggles                               | Text "Show more" / "Show fewer", `.analysis__more` class. Fold at whole rows                                                                                               | `src/components/playerAnalysis/AnalysisSummary.scss` |
| Bands and section headers                  | `--rak-band-header` fill, `--rak-on-solid` ink                                                                                                                             | `src/index.scss`                                     |

## States and chrome

- Disabled items keep their normal background. Fade text and icon only. No hover or
  press fill. `cursor: not-allowed` inside `can-hover`. Ink `--rak-disabled-text`, or on
  the navbar fill, `--rak-nav-ink` at 70%.
- Give a disabled item's reason as a smaller line under its name, aligned with
  it, at every width. Also its `aria-describedby`. No tooltips.
- Hover only inside `can-hover`. Every interactive element gets `focus-ring` and a
  minimum `--rak-touch-target`.
- Dividers use `--rak-on-solid`, as `.navbar__divider` does. Inside a popup list,
  rows split in the popup's edge color and width, `--rak-panel-border` hairline.
- Menu rows, popup and drawer alike: one `nav-menu-row` mixin
  (`src/components/navbar/NavMenu.scss`). Plain full-width rows, never the bar's
  LED keys.
- Spacing: `--rak-space-2` inside a block, `--rak-space-4` between blocks. Even gaps.
  Real spaces or `gap`, never a margin standing in for one.
- LCD styles (`src/styles/_lcd.scss`): `lcd-glass` only for the scoreline and the
  navbar name, `lcd-field` only for a text input or select well. Never for a pick,
  a label, or a heading.
- Color reaches 4.5:1 for text, 3:1 for shapes carrying meaning, in both themes.
  Check each token's dark-theme value separately.

## Checking work

1. Screenshot at 360px as a touch phone: `record-demo` skill,
   `--touch --device-scale-factor 3`. Confirm the refresh button is hidden.
2. Also screenshot wide desktop. Both sizes in light and in dark.
3. Run `make setup` first. Without it, fonts fall back.
4. Cases the screenshots must show: a live game, the reader's own player, a long
   name, a folded list.
5. Compare against the same information in the player analysis dialog and the Game
   Status dialog.
6. Measure alignment and spacing in the browser, not by eye.
