# public

Vite copies these to the build root as they are. `index.html` at the repo root
names them by absolute path.

- `manifest.json`: the installed app, called Rakulator, standalone, and its icons
- `favicon.ico`, `logo192.png`, `logo512.png`: the icons the manifest and the
  shell point at
- `robots.txt`: denies every crawler, because a private pool's results are not
  for one
- `_headers`: Cache-Control for `/assets/` and `/fonts/`, read by Pages, not served

## Subdirectories

- [`fonts/`](fonts/CLAUDE.md) — the faces `index.html` preloads itself
