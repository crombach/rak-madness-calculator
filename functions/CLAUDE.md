# functions

Cloudflare Pages Functions, separate from the Vite build. Cloudflare bundles them
with the site it builds from git. They serve `/api/*` in production only, so a Vite
dev server has no `/api` behind it. `tsconfig.json`: the Workers types and the bundler resolver
these files need, which the app's own config does not carry.

## Subdirectories

- [`api/picks/`](api/picks/CLAUDE.md) — the picks routes and their R2 bucket
