import { readSettledWeek, writeSettledWeek } from "./settledWeeksCache";

const SEASON = 2025;

beforeEach(() => {
  localStorage.clear();
});

describe("settledWeeksCache", () => {
  it("reads a week it never scored as open", () => {
    expect(readSettledWeek(SEASON, 3)).toBe(false);
  });

  it("reads back a settled week", () => {
    writeSettledWeek(SEASON, 3, true);

    expect(readSettledWeek(SEASON, 3)).toBe(true);
    expect(readSettledWeek(SEASON, 4)).toBe(false);
    expect(readSettledWeek(2024, 3)).toBe(false);
  });

  it("reopens a week scored open after it settled", () => {
    writeSettledWeek(SEASON, 3, true);
    writeSettledWeek(SEASON, 3, false);

    expect(readSettledWeek(SEASON, 3)).toBe(false);
  });

  it("reads anything but true as open", () => {
    localStorage.setItem(`rak-madness:settled:${SEASON}:3`, '"yes"');

    expect(readSettledWeek(SEASON, 3)).toBe(false);
  });
});
