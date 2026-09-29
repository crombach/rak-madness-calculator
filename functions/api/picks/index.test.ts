import { afterEach, describe, expect, it, vi } from "vitest";
import { makeContext, stubCache } from "./testHelpers";
import { onRequestGet } from "./index";

type Page = {
  objects: Array<{ key: string }>;
  truncated: boolean;
  cursor?: string;
};

function call(
  list: (options: { prefix: string; cursor?: string }) => Promise<Page>,
) {
  const ctx = makeContext({
    request: new Request("https://example.test/api/picks"),
    env: { RAK_MADNESS_BUCKET: { list } },
  });
  return onRequestGet(ctx as unknown as Parameters<typeof onRequestGet>[0]);
}

const keys = (...names: Array<string>): Page => ({
  objects: names.map((key) => ({ key })),
  truncated: false,
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("GET /api/picks", () => {
  it("lists seasons and weeks newest first", async () => {
    stubCache();

    const response = await call(async () =>
      keys(
        "picks/2024/3.xlsx",
        "picks/2025/2.xlsx",
        "picks/2025/10.xlsx",
        "picks/2025/1.xlsx",
      ),
    );

    expect(await response.json()).toEqual({
      seasons: [
        { season: 2025, weeks: [10, 2, 1] },
        { season: 2024, weeks: [3] },
      ],
    });
    expect(response.headers.get("Cache-Control")).toBe("public, max-age=60");
  });

  it("ignores keys that are not a week's workbook", async () => {
    stubCache();

    const response = await call(async () =>
      keys("picks/2025/notes.txt", "picks/2025/3.xlsx.bak", "picks/25/1.xlsx"),
    );

    expect(await response.json()).toEqual({ seasons: [] });
  });

  it("follows the cursor across truncated pages", async () => {
    stubCache();
    const pages: Record<string, Page> = {
      first: { ...keys("picks/2025/1.xlsx"), truncated: true, cursor: "next" },
      next: keys("picks/2025/2.xlsx"),
    };

    const response = await call(async ({ cursor }) => pages[cursor ?? "first"]);

    expect(await response.json()).toEqual({
      seasons: [{ season: 2025, weeks: [2, 1] }],
    });
  });

  it("503s when the bucket cannot be listed", async () => {
    stubCache();
    vi.spyOn(console, "error").mockImplementation(() => {});

    const response = await call(async () => {
      throw new Error("R2 down");
    });

    expect(response.status).toBe(503);
  });
});
