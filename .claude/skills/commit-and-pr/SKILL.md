---
name: commit-and-pr
description: This repo's commit and PR conventions. Read before writing any git commit message, `gh pr create`/`gh pr edit` title, or PR body here. Header format, ticket key placement, scope vocabulary, PR template.
---

# Commits and pull requests

- Commit subject + PR title, one format: `<type>(<scope>)?!?: [<issue>]? <imperative summary>`. Conventional Commits types. `!` = breaking.
- Scope = module. `[<issue>]` = main ticket ID: `feat(auth): [YCOM-21] add device-code login`.
- PR body: build from `.github/pull_request_template.md`, write over its comments. `--body`/`--body-file` skip prefill.
- PR body links every ticket work belongs to, title's key first. Hook only sees branch's key, rest is on you. No ticket: link nothing, never invent key.
- PR body length: under 256 words, bullets one line each. Only what a reviewer needs to review the diff. No ticket retelling, no history, no counts or benchmark numbers, no per-file walkthrough, no self-assessment. Headings, an attribution footer, embedded screenshots and recordings don't count against the budget.
- Commit body: only a why subject can't carry.
- Prose in a subject, commit body, or PR body: the ASD-STE100 rules `.github/pull_request_template.md` lists. The hook reads them off that file at runtime.
- Hook denies, never warns: the header format, the branch's ticket key opening the summary, a PR body built from the template with no leftover guidance comments and no empty sections, a body link to the branch's ticket, an em-dash, en-dash or semicolon in a PR body, the PR body word budget, and three prose rules over a subject, a `-m` body and a PR body: the 20-word sentence cap, a long word with a short swap, an `-ing` form used as a noun.
- Yours to judge: every other template rule, active voice, tense, noun clusters, American spellings, and every ticket the branch does not name.
- Enforced by `.claude/hooks/check_conventions.py`, `.github/workflows/pr-title.yml`.
- No bypass. Rewrite text, don't work around hook.
