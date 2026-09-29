import kickoffDay, { KickoffDay } from "./kickoffDay";

const NOW = new Date(2024, 9, 6, 13, 0);

describe("kickoffDay", () => {
  it("says today for a kickoff later on the reader's day", () => {
    expect(kickoffDay(new Date(2024, 9, 6, 23, 59), NOW)).toBe(
      KickoffDay.TODAY,
    );
  });

  it("says today for a kickoff already past, the game not yet started", () => {
    expect(kickoffDay(new Date(2024, 9, 5, 20, 0), NOW)).toBe(KickoffDay.TODAY);
  });

  it("says tomorrow from midnight to midnight", () => {
    expect(kickoffDay(new Date(2024, 9, 7, 0, 0), NOW)).toBe(
      KickoffDay.TOMORROW,
    );
    expect(kickoffDay(new Date(2024, 9, 7, 23, 59), NOW)).toBe(
      KickoffDay.TOMORROW,
    );
  });

  it("says later for anything after tomorrow", () => {
    expect(kickoffDay(new Date(2024, 9, 8, 0, 0), NOW)).toBe(KickoffDay.LATER);
  });

  it("reads the day in the reader's own time zone", () => {
    const zone = process.env.TZ;
    // 8:30pm on the 6th in Los Angeles, 4:30am on the 7th in London.
    const kickoff = new Date("2024-10-07T03:30:00Z");
    const now = new Date("2024-10-06T20:00:00Z");
    try {
      process.env.TZ = "America/Los_Angeles";
      expect(kickoffDay(kickoff, now)).toBe(KickoffDay.TODAY);
      process.env.TZ = "Europe/London";
      expect(kickoffDay(kickoff, now)).toBe(KickoffDay.TOMORROW);
    } finally {
      process.env.TZ = zone;
    }
  });

  it("counts calendar days across a month end", () => {
    const lastOfMonth = new Date(2024, 9, 31, 22, 0);
    expect(kickoffDay(new Date(2024, 10, 1, 9, 0), lastOfMonth)).toBe(
      KickoffDay.TOMORROW,
    );
  });
});
