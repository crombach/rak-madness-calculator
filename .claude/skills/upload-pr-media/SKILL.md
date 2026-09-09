---
name: upload-pr-media
description: Host a screenshot, video, or recording (from record-demo or elsewhere) on the pr-assets branch and get back the raw URL to embed it in a PR body. Use whenever a PR body should show a before/after image or a demo clip, since gh has no other way to attach one.
---

# Upload PR media

```bash
bash .claude/skills/upload-pr-media/scripts/upload_pr_media.sh \
  --feature <name> <file> [<file> ...]
```

Prints `RESULT: OK` then one `https://raw.githubusercontent.com/...` URL per
file. Embed it in the PR body: `![before](<url>)` for an image,
`<video src="<url>" controls></video>` for an `.mp4`/`.webm` (GitHub's markdown
renders both).

`--feature` should read like a slug for what the PR is about, not the git
branch name character for character. Readable in a URL, and stable if the
branch gets renamed. Reuse the same `--feature` for every file in one PR,
and reuse it again on a later commit to that PR instead of inventing a new
name, so a repeat run lands in the same directory rather than scattering it.

Never commit media to the feature branch itself. pr-assets exists so a PR's
diff stays code only.
