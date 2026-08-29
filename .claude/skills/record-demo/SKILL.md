---
name: record-demo
description: Record a screenshot or video of a real, running change in this app for a PR, with the picks API and ESPN network calls mocked so no live backend or internet access is needed. Use when asked to record a demo, capture a screenshot, or show a UI fix in a PR.
---

# Record a demo

Everything deterministic lives in `scripts/`. This file only says how to invoke it.

## Prerequisites

- The dev server running: `make run` (serves `http://localhost:3000`).
- Playwright's Chromium downloaded once: `npx playwright install chromium`.
- For `--mp4`: `ffmpeg` on `PATH`.

## Record a video

```bash
node .claude/skills/record-demo/scripts/record.js \
  --scenario .claude/skills/record-demo/scripts/scenarios/<name>.js \
  --out <path>.mp4 --mp4
```

Drop `--mp4` to keep the raw `.webm`. Add `--base-url` for a non-default dev
server port, `--viewport WxH` for a different size (default `430x900`, this
app's own phone-first default), and `--touch` for a scenario driving a touch
gesture, which also turns off every `can-hover` rule.

## Take a screenshot instead

```bash
node .claude/skills/record-demo/scripts/record.js \
  --scenario .claude/skills/record-demo/scripts/scenarios/<name>.js \
  --out <path>.png --screenshot
```

Same scenario files work for both; `--screenshot` takes one final-state PNG
instead of recording the whole run.

## Existing scenarios

- `scenarios/scroll-overlap.js` — pans the picks table right across its
  colored columns, player column pinned left the whole way.
- `scenarios/led-indicator.js` — crops the navbar view switch, the settings
  dialog theme switch, the reader's own row, and the home page's two colored
  keys, in both themes. Writes its crops to `$LED_SHOT_DIR`, so `--out` is a
  throwaway.
- `scenarios/pull-to-refresh.js` — pulls down from the top of the scoreboard on
  a phone, where the navbar's refresh button is read and not drawn. Needs
  `--touch`.
- `scenarios/live-refresh.js` — opens the Game Status dialog on a live pick,
  waits out its real poll interval, and shows the table update on its own
  once the mocked game goes final.

## Writing a new scenario

Copy an existing one under `scenarios/`. A scenario is a default-exported
`async function({ page, context, baseUrl })` that:

1. Calls `registerAppMocks(context, { season, week, xlsxBuffer, events })`
   from `lib/mocks.js`, so the real app renders against fixture data instead
   of the network. `buildPicksWorkbook(rows)` builds the xlsx `route.fulfill`
   serves for `/api/picks/:season/:week`; `makeGame(...)` builds one ESPN
   scoreboard event for `events()` to return.
2. Navigates and drives `page` with normal Playwright calls.

`lib/mocks.js` mocks exactly the requests `functions/api/picks/**`,
`src/utils/getLeagueInfo.ts`, and `src/utils/getLeagueResults.ts` make. Keep
it in step with those if their URLs or query params change.

## Once you have the file

Read a `.png` with the Read tool and it renders in the transcript. A video
cannot render, so give the user its path instead. To embed either one in a PR
body, the `upload-pr-media` skill hosts it and hands back the URL.
