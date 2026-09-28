# styles

Sass partials, mixins and variables only, so a partial emits no CSS however many
files `@use` it. `_skeleton.scss` is the one exception, and says so: it holds
keyframes. Design tokens live in `src/index.scss` instead.

The `ui-style` skill maps each piece of UI to its token, mixin, or class.

- `_breakpoints.scss`: `roomy-screen`, `labeled-navbar`, `wide-screen`,
  `can-hover`, `phone-landscape`, `phone-touch`, `reduced-motion`. Mixins rather
  than custom properties, because a custom property does not work inside a media
  query. Reach them with `@use "…/styles/breakpoints" as *;`. Every width one is
  `min-width` and the phone's rules are the base, except `phone-touch`, which is a
  swap rather than extra room.
- `_focus.scss`: `focus-ring`, the app's one focus ring, and `$focus-ring-reach`,
  the room it needs outside a control a scrolling ancestor would clip it against
- `_ink.scss`: `ink-height`, an icon drawn as tall as the text beside it, the
  faces' cap shares, and `live-dot`, the one red dot for a game being played
- `_a11y.scss`: `visually-hidden`
- `_label.scss`: `micro-label`, the tracked capitals every small label is set in
- `_lcd.scss`: `lcd-glass`, the readout the scoreline and the navbar name share,
  and `lcd-field`, the same well for a control typed or chosen into instead
- `_listbox.scss`: `listbox-popup` and `listbox-item`, a Base UI popup list's shape
- `_skeleton.scss`: `skeleton-surface`, `skeleton-sheen`, `skeleton-reserve`
- `_picks.scss`: `pick-type`, `pick-face`, `pick-label`, and `ruled-block` with
  its `$rule-*` colors. How a pick, its game ID and a ruled block look anywhere
- `_text.scss`: `truncate-line`, one line cut short where it runs out of room,
  and `player-name-face` and `my-player-name`, the tables' name type
