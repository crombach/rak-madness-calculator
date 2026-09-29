import { afterEach, describe, expect, it, vi } from "vitest";
import { makeContext, stubCache } from "./testHelpers";
import { onRequestGet } from "./[season]/[week]";

const ETAG = '"abc123"';
const XLSX_TYPE =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

type Get = (key: string, options: { onlyIf: Headers }) => Promise<unknown>;

function call(
  params: { season: string; week: string },
  get: Get,
  headers: Record<string, string> = {},
) {
  const ctx = makeContext({
    request: new Request("https://example.test/api/picks/x", { headers }),
    params,
    env: { RAK_MADNESS_BUCKET: { get } },
  });
  // The handler's context type is the whole EventContext, which the fake is not.
  return onRequestGet(ctx as unknown as Parameters<typeof onRequestGet>[0]);
}

const found = (): Get => async () => ({
  httpEtag: ETAG,
  body: new Response("workbook").body,
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("GET /api/picks/:season/:week", () => {
  it.each([
    { season: "abc", week: "1" },
    { season: "2025", week: "one" },
    { season: "2025", week: "1.5" },
  ])("404s on a non-integer segment %o without reading R2", async (params) => {
    stubCache();
    const get = vi.fn<Get>(async () => null);

    const response = await call(params, get);

    expect(response.status).toBe(404);
    expect(get).not.toHaveBeenCalled();
  });

  it("404s when the bucket has no such object", async () => {
    stubCache();

    const response = await call(
      { season: "2025", week: "9" },
      async () => null,
    );

    expect(response.status).toBe(404);
  });

  it("reads the object filed under the season and week", async () => {
    stubCache();
    const get = vi.fn<Get>(found());

    await call({ season: "2025", week: "7" }, get);

    expect(get.mock.calls[0][0]).toBe("picks/2025/7.xlsx");
  });

  it("200s with the workbook and its cache headers", async () => {
    stubCache();

    const response = await call({ season: "2025", week: "7" }, found());

    expect(response.status).toBe(200);
    expect(await response.text()).toBe("workbook");
    expect(response.headers.get("Content-Type")).toBe(XLSX_TYPE);
    expect(response.headers.get("ETag")).toBe(ETAG);
    expect(response.headers.get("Cache-Control")).toBe(
      "public, max-age=0, s-maxage=60, must-revalidate",
    );
  });

  it("answers a matching If-None-Match with a bodyless 304", async () => {
    stubCache();
    const get = vi.fn<Get>(async () => ({ httpEtag: ETAG }));

    const response = await call({ season: "2025", week: "7" }, get, {
      "If-None-Match": ETAG,
    });

    expect(get.mock.calls[0][1].onlyIf.get("If-None-Match")).toBe(ETAG);
    expect(response.status).toBe(304);
    expect(await response.text()).toBe("");
    expect(response.headers.get("ETag")).toBe(ETAG);
  });

  it("503s when R2 throws", async () => {
    stubCache();
    vi.spyOn(console, "error").mockImplementation(() => {});

    const response = await call({ season: "2025", week: "7" }, async () => {
      throw new Error("R2 down");
    });

    expect(response.status).toBe(503);
  });
});
