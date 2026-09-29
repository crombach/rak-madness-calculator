# styles

Sass partials, mixins and variables only, so a partial emits no CSS however many
files `@use` it. `_skeleton.scss` and `_progress.scss` are the exceptions: they
hold keyframes. Design tokens live in `src/index.scss` instead.

The `ui-style` skill maps each piece of UI to its token, mixin, or class.

- `_breakpoints.scss`: `roomy-screen`, `labeled-navbar`, `wide-screen`,
  `short-screen`, `can-hover`, `phone-landscape`, `phone-touch`,
  `reduced-motion`. Mixins rather
  than custom properties, because a custom property does not work inside a media
  query. Reach them with `@use "…/styles/breakpoints" as *;`. Every width one is
  `min-width` and the phone's rules are the base, except `phone-touch`, which is a
  swap rather than extra room, and `short-screen`, a `max-height`.
- `_focus.scss`: `focus-ring`, the app's one focus ring, and `$focus-ring-reach`,
  the room it needs outside a control a scrolling ancestor would clip it against
- `_ink.scss`: `ink-height`, an icon drawn as tall as the text beside it, the
  faces' cap shares, and `live-dot`, the one red dot for a game being played
- `_a11y.scss`: `visually-hidden`
- `_layout.scss`: `$content-width`, the column the navbar and pages stand in,
  `stacked`, and `dialog-column`
- `_page.scss`: `page-body`, and the game card frame and band, shared by the card pages
- `_interactive.scss`: `interactive-fill`, the hover and press fill
- `_fold.scss`: `fold-toggle`, the Show More button
- `_label.scss`: `micro-label`, the tracked capitals every small label is set in,
  and `section-title`, the heading over a block, in the one secondary ink
- `_lcd.scss`: `lcd-glass`, the readout the scoreline and the navbar name share,
  and `lcd-field`, the same well for a control typed or chosen into instead
- `_listbox.scss`: `listbox-popup` and `listbox-item`, a Base UI popup list's shape
- `_skeleton.scss`: `skeleton-surface`, `skeleton-sheen`, `skeleton-reserve`
- `_progress.scss`: `progress-bar`, the sweep a wait draws without moving the
  page, and `$progress-height`
- `_picks.scss`: `pick-type`, `pick-face`, `pick-label`, and `ruled-block` with
  its `$rule-*` colors. How a pick, its game ID and a ruled block look anywhere
- `_text.scss`: `truncate-line`, one line cut short where it runs out of room,
  and `player-name-face` and `my-player-name`, the tables' name type
