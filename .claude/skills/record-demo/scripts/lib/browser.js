import { chromium } from "playwright";
import { spawnSync } from "node:child_process";
import { mkdtemp, readdir, rename, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

/**
 * Launches a Chromium page against a running dev server, recording video
 * unless `screenshot` is set. Call the returned `finish()` exactly once, after
 * driving the page, to flush the recording (if any) to `outPath` and close
 * the browser.
 *
 * @param {{
 *   outPath: string,
 *   screenshot?: boolean,
 *   viewport?: { width: number, height: number },
 *   touch?: boolean,
 *   mp4?: boolean,
 * }} options
 */
export async function launchDemo({
  outPath,
  screenshot = false,
  viewport = { width: 430, height: 900 },
  touch = false,
  mp4 = false,
}) {
  const browser = await chromium.launch({ headless: true });
  const videoDir = screenshot
    ? undefined
    : await mkdtemp(path.join(tmpdir(), "record-demo-"));
  const context = await browser.newContext({
    viewport,
    // A phone rather than a narrow desktop window. Off by default, because it
    // also turns off every `can-hover` rule, which is what the other scenarios
    // are capturing. Without it Chromium reports `hover: hover` and
    // `pointer: fine`, so a scenario driving a touch gets no phone-only rules.
    hasTouch: touch,
    isMobile: touch,
    recordVideo: videoDir ? { dir: videoDir, size: viewport } : undefined,
  });
  const page = await context.newPage();

  async function finish() {
    if (screenshot) {
      await page.screenshot({ path: outPath });
      await context.close();
      await browser.close();
      return outPath;
    }

    await context.close(); // flushes the .webm into videoDir
    await browser.close();
    const [webmName] = await readdir(videoDir);
    const webmPath = path.join(videoDir, webmName);

    if (!mp4) {
      await rename(webmPath, outPath);
      return outPath;
    }

    const mp4Path = outPath.endsWith(".mp4") ? outPath : `${outPath}.mp4`;
    const result = spawnSync(
      "ffmpeg",
      [
        "-y",
        "-i",
        webmPath,
        "-c:v",
        "libx264",
        "-pix_fmt",
        "yuv420p",
        "-movflags",
        "+faststart",
        mp4Path,
      ],
      { stdio: "inherit" },
    );
    await rm(videoDir, { recursive: true, force: true });
    if (result.status !== 0) {
      throw new Error(`ffmpeg exited with status ${result.status}`);
    }
    return mp4Path;
  }

  return { browser, context, page, finish };
}
