# src

`index.tsx`: Vite entry, loaded by the root `index.html`. React 19 `createRoot` mount into `#root`, wraps `App` in `BrowserRouter`, `SettingsContextProvider`, `ToastContextProvider`, and `AppDataContextProvider`, with `Toaster` beside it. `App.tsx`: the route table. `index.scss`: global resets, the body baseline, every `--rak-*` design token, and
a `dark-tokens` mixin the OS or a saved `data-theme` applies. Its comment explains `<html>`'s overflow. Base UI is unstyled, so tokens plus SCSS carry the whole look. `setupTests.ts`: Vitest setup. jest-dom, a raised `asyncUtilTimeout`, `ResizeObserver` and `matchMedia` stubs, and the `jest` global shim @testing-library/dom needs to drive fake timers.

## Subdirectories

- [`components/button/`](components/button/CLAUDE.md) — shared button, Base UI's primitive
- [`components/dialog/`](components/dialog/CLAUDE.md) — the shared dialog shell and its search
- [`components/footer/`](components/footer/CLAUDE.md) — bottom links bar
- [`components/gameStatus/`](components/gameStatus/CLAUDE.md) — how one game in the week is going
- [`components/home/`](components/home/CLAUDE.md) — home route: pickers, upload, export
- [`components/icon/`](components/icon/CLAUDE.md) — SVG icons inlined from Material Design
- [`components/navbar/`](components/navbar/CLAUDE.md) — top nav bar, view switch, logo button
- [`components/pageLayout/`](components/pageLayout/CLAUDE.md) — the chrome every page shares
- [`components/playerAnalysis/`](components/playerAnalysis/CLAUDE.md) — where a player stands, and why
- [`components/results/`](components/results/CLAUDE.md) — results routes, layout, redirect
- [`components/settings/`](components/settings/CLAUDE.md) — theme and own name, in a dialog
- [`components/table/`](components/table/CLAUDE.md) — shared frame and the results tables
- [`components/toaster/`](components/toaster/CLAUDE.md) — toast notification renderer
- [`context/`](context/CLAUDE.md) — app data, toast, and analysis providers
- [`hooks/`](hooks/CLAUDE.md) — picks, scoring, export, guard, measurement
- [`styles/`](styles/CLAUDE.md) — Sass mixins: breakpoints, listbox shape
- [`types/`](types/CLAUDE.md) — ESPN, league, and scoring types
- [`utils/`](utils/CLAUDE.md) — scoring, ESPN, export, picks cache
