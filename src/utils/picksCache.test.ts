import { readCachedPicks, writeCachedPicks } from "./picksCache";
import { storageContractSuite, mockRejectedSetItem } from "./storageMockUtils";

const SEASON = 2025;

function buffer(...bytes: Array<number>): ArrayBuffer {
  return new Uint8Array(bytes).buffer;
}

function bytesOf(value: ArrayBuffer | undefined): Array<number> | undefined {
  return value != null ? Array.from(new Uint8Array(value)) : undefined;
}

beforeEach(() => {
  localStorage.clear();
});

describe("picksCache", () => {
  it("reads back what it wrote", () => {
    writeCachedPicks(SEASON, 3, buffer(1, 2, 250));

    expect(bytesOf(readCachedPicks(SEASON, 3))).toEqual([1, 2, 250]);
  });

  it("keeps each season separate", () => {
    writeCachedPicks(2024, 3, buffer(24));
    writeCachedPicks(2025, 3, buffer(25));

    expect(bytesOf(readCachedPicks(2024, 3))).toEqual([24]);
    expect(bytesOf(readCachedPicks(2025, 3))).toEqual([25]);
  });

  it("keeps each week separate", () => {
    writeCachedPicks(SEASON, 3, buffer(3));
    writeCachedPicks(SEASON, 4, buffer(4));

    expect(bytesOf(readCachedPicks(SEASON, 3))).toEqual([3]);
    expect(bytesOf(readCachedPicks(SEASON, 4))).toEqual([4]);
  });

  it("misses on a week that was never cached", () => {
    expect(readCachedPicks(SEASON, 9)).toBeUndefined();
  });

  it("survives a workbook larger than one encoding chunk", () => {
    const big = new Uint8Array(20000).map((_, index) => index % 256);

    writeCachedPicks(SEASON, 5, big.buffer);

    expect(bytesOf(readCachedPicks(SEASON, 5))).toEqual(Array.from(big));
  });

  it("caps how many weeks it holds, keeping the one just written", () => {
    [1, 2, 3, 4].forEach((week) =>
      writeCachedPicks(SEASON, week, buffer(week)),
    );

    expect(bytesOf(readCachedPicks(SEASON, 4))).toEqual([4]);
    const cached = [1, 2, 3, 4].filter(
      (week) => readCachedPicks(SEASON, week) != null,
    ).length;
    expect(cached).toBe(3);
  });

  it("treats an entry it cannot decode as a miss", () => {
    writeCachedPicks(SEASON, 3, buffer(1));
    localStorage.setItem(`rak-madness:picks:${SEASON}:3`, "!!!");

    expect(readCachedPicks(SEASON, 3)).toBeUndefined();
  });

  it("leaves nothing behind when storage rejects a write", () => {
    writeCachedPicks(SEASON, 3, buffer(1));
    mockRejectedSetItem();

    writeCachedPicks(SEASON, 4, buffer(4));

    expect(readCachedPicks(SEASON, 3)).toBeUndefined();
    expect(readCachedPicks(SEASON, 4)).toBeUndefined();
  });

  describe("picksCache, storage contract", () => {
    storageContractSuite(
      () => readCachedPicks(SEASON, 3),
      () => writeCachedPicks(SEASON, 3, buffer(1)),
    );
  });
});
