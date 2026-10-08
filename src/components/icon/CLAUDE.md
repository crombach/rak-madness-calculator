# icon

Every icon the app draws, as one `<svg>` each. Path data copied verbatim from
Material Symbols Sharp at weight 400 (Apache 2.0), inlined because an icon
package built on components drags a UI library and emotion in behind it. Sharp
for its square terminals, which match the app's keys and bezels. `ConfirmIcon`
alone is drawn here, not copied.

`Icon` draws in Symbols' own `0 -960 960 960` box, so nothing is rescaled. A
caller passes `viewBox` for a shape from elsewhere (`GitHubIcon`) or to cut the box
to the shape's own edges (`PossessionIcon`).

`Icon.scss` holds the 24px box. A caller wanting another size overrides
`width`/`height` from an `--rak-icon-*` token.

Each icon carries a `data-testid`, which is how the toaster and player status
suites find them.
