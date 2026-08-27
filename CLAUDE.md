# rak-madness-calculator

Auto-scoring web app for the Rak Madness football pool. Vite + React 19 +
TypeScript, react-router, Base UI, SCSS. Vitest and ESLint flat config.
Scores an uploaded picks spreadsheet against ESPN results, exports XLSX.
Home page at `/`, a week's results at `/:season/:week/scoreboard` and
`/:season/:week/picks`, and `/scoreboard` and `/picks` redirect to the latest week
worth showing. A dialog off the home page footer holds the reader's theme and own name. Deployed to Cloudflare Pages (`wrangler`), which serves the picks
API in `functions/` beside the built app.

`index.html` at the repo root is the HTML shell Vite builds from. Before the
first paint it sets `data-theme` from storage and preloads the logo's face.

[`SCROLL-FLASH.md`](SCROLL-FLASH.md): an open bug, read before changing sticky.

## Subdirectories

- [`functions/`](functions/CLAUDE.md) — the picks routes, on Pages and R2
- [`public/`](public/CLAUDE.md) — icons, manifest, robots, the logo's font
- [`src/`](src/CLAUDE.md) — application source

## Maintaining this tree

Navigation index. Changed a dir: update its CLAUDE.md summary and the parent's
link. New meaningful dir: add a CLAUDE.md, link it. Pointer <= 70 chars. Every
CLAUDE.md, outside its Subdirectories list and this block: 120 words, or 40 plus
8 for each file a bullet names, whichever is larger. Ceiling,
not target: land under it, or the next edit pays to shave. `make lint-docs`
enforces it. Over it, the detail belongs at the point of definition, in a comment
or docblock beside the code. A skill under `.claude/skills/` is for what no one
file can hold.

Measure a rewrite before writing it, which is one pass rather than several:

    python3 .claude/scripts/lint_claude_md.py count -    # draft on stdin
    python3 .claude/scripts/lint_claude_md.py count DIR  # words, headroom, heaviest blocks
