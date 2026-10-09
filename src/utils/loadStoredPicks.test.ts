import { League, WeekInfo } from "../types/League";
import { XLSX_CONTENT_TYPE } from "./buildSpreadsheetBuffer";
import getLeagueInfo from "./getLeagueInfo";
import loadStoredPicks, { prefetchStoredPicks } from "./loadStoredPicks";
import { readCachedPicks, writeCachedPicks } from "./picksCache";

const xlsxImported = vi.hoisted(() => vi.fn());
const xlsxStub = vi.hoisted(() => () => {
  xlsxImported();
  return {};
});
vi.mock("xlsx-js-style", xlsxStub);
vi.mock("./getLeagueInfo");

const SEASON = 2025;
const WEEK = { value: 4, label: "Week 4" } as WeekInfo;

function bytesOf(value: ArrayBuffer | undefined): Array<number> | undefined {
  return value != null ? Array.from(new Uint8Array(value)) : undefined;
}

function respond(body: BodyInit | null, init: ResponseInit) {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(body, init)));
}

function respondWithWorkbook(bytes: Array<number>) {
  respond(new Uint8Array(bytes), {
    status: 200,
    headers: { "Content-Type": XLSX_CONTENT_TYPE },
  });
}

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("loadStoredPicks", () => {
  it("returns the workbook and caches it for later", async () => {
    respondWithWorkbook([1, 2, 3]);

    const loaded = await loadStoredPicks(SEASON, WEEK);

    expect(bytesOf(loaded)).toEqual([1, 2, 3]);
    expect(bytesOf(readCachedPicks(SEASON, WEEK.value))).toEqual([1, 2, 3]);
  });

  it("rejects on a 404 when nothing is cached", async () => {
    respond("Not Found", { status: 404 });

    await expect(loadStoredPicks(SEASON, WEEK)).rejects.toThrow(
      "Picks spreadsheet is missing from the picks store",
    );
  });

  it("rejects on a response that is not a spreadsheet", async () => {
    respond("<html></html>", {
      status: 200,
      headers: { "Content-Type": "text/html" },
    });

    await expect(loadStoredPicks(SEASON, WEEK)).rejects.toThrow(
      "Picks response was text/html, not a spreadsheet",
    );
  });

  it("rejects on an empty body", async () => {
    respond(new Uint8Array([]), {
      status: 200,
      headers: { "Content-Type": XLSX_CONTENT_TYPE },
    });

    await expect(loadStoredPicks(SEASON, WEEK)).rejects.toThrow(
      "Empty picks buffer",
    );
  });

  it("falls back to the cached copy when the API has none", async () => {
    writeCachedPicks(SEASON, WEEK.value, new Uint8Array([9, 8]).buffer);
    respond("Not Found", { status: 404 });

    expect(bytesOf(await loadStoredPicks(SEASON, WEEK))).toEqual([9, 8]);
  });

  it("falls back to the cached copy when the fetch fails", async () => {
    writeCachedPicks(SEASON, WEEK.value, new Uint8Array([7]).buffer);
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));

    expect(bytesOf(await loadStoredPicks(SEASON, WEEK))).toEqual([7]);
  });

  it("does not replace the cached copy with a bad response", async () => {
    writeCachedPicks(SEASON, WEEK.value, new Uint8Array([9]).buffer);
    respond(new Uint8Array([]), {
      status: 200,
      headers: { "Content-Type": XLSX_CONTENT_TYPE },
    });

    await loadStoredPicks(SEASON, WEEK);

    expect(bytesOf(readCachedPicks(SEASON, WEEK.value))).toEqual([9]);
  });
});

describe("the xlsx parser", () => {
  it("starts loading while the picks request is still in flight", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => new Promise(() => {})),
    );

    // A fresh module, since the first load of the parser is shared.
    vi.resetModules();
    vi.doMock("xlsx-js-style", xlsxStub);
    const fresh = await import("./loadStoredPicks");

    fresh.default(SEASON, WEEK).catch(() => {});
    await vi.waitFor(() => expect(xlsxImported).toHaveBeenCalled());
  });
});

describe("prefetchStoredPicks", () => {
  it("asks for the college calendar beside the picks", () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => new Promise(() => {})),
    );
    vi.mocked(getLeagueInfo).mockResolvedValue(null);

    prefetchStoredPicks(SEASON + 1, 1);

    expect(getLeagueInfo).toHaveBeenCalledWith(League.COLLEGE, SEASON + 1);
  });
});
