import { readdir, rm } from "node:fs/promises";
import path from "node:path";
import react from "@vitejs/plugin-react";
import type { Plugin } from "vite";
import { configDefaults, defineConfig } from "vitest/config";

const DEV_PORT = Number(process.env.PORT ?? 3000);

// Vite copies `public/` to the build root, and every CLAUDE.md indexing it is
// written for agents reading the repo, not for anyone fetching the site. Whole
// tree rather than the root alone, since a subdirectory there carries its own.
function dropPublicClaudeMd(): Plugin {
  return {
    name: "drop-public-claude-md",
    apply: "build",
    async writeBundle(options) {
      const dir = options.dir ?? "build";
      const entries = await readdir(dir, { recursive: true });
      await Promise.all(
        entries
          .filter((entry) => path.basename(entry) === "CLAUDE.md")
          .map((entry) => rm(path.join(dir, entry), { force: true })),
      );
    },
  };
}

// `xlsx-js-style` inlines the `cpexcel` codepage table, 176 KB gzipped, which
// only the legacy `.xls` and `.csv` readers use. The app takes `.xlsx` alone, on
// upload, from storage and on export, and those never reach a codepage.
function stubXlsxCodepages(): Plugin {
  const stubId = "\0xlsx-codepages-stub";
  return {
    name: "stub-xlsx-codepages",
    enforce: "pre",
    resolveId(id) {
      if (/(^|\/)cpexcel(\.js)?$/.test(id)) return stubId;
    },
    load(id) {
      if (id === stubId) return "export default undefined;";
    },
  };
}

export default defineConfig({
  plugins: [react(), stubXlsxCodepages(), dropPublicClaudeMd()],
  build: {
    // The Cloudflare Pages build serves ./build, and `pages:dev` serves it locally.
    outDir: "build",
    // Above the `xlsx-js-style` chunk, which is large on purpose and fetched only
    // when a workbook is read or written. Low enough to still complain if the
    // chunk the app loads up front grows towards it.
    chunkSizeWarningLimit: 900,
  },
  // Fail loudly on a busy port rather than sliding to the next one.
  server: { port: DEV_PORT, strictPort: true },
  preview: { port: DEV_PORT, strictPort: true },
  test: {
    globals: true,
    // A checkout under here has its own src/, which the default excludes miss
    // because they skip only node_modules and .git.
    exclude: [...configDefaults.exclude, ".claude/worktrees/**"],
    // Several suites assume a clean call count per test.
    mockReset: true,
    projects: [
      {
        extends: true,
        test: {
          name: "app",
          environment: "jsdom",
          include: ["src/**/*.test.{ts,tsx}"],
          setupFiles: ["./src/setupTests.ts"],
          // The suites assert on class names, never on rendered styles.
          css: false,
          // Above the 5s a single `findBy` is now allowed to wait, so a slow wait fails
          // on its own assertion rather than on the test running out of time.
          testTimeout: 15000,
        },
      },
      {
        // The Functions run on Workers, not in a browser, and setupTests reaches for `window`.
        extends: true,
        test: {
          name: "functions",
          environment: "node",
          include: ["functions/**/*.test.ts"],
        },
      },
    ],
  },
});
