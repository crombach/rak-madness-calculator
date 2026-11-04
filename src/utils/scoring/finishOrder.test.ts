import compareFinish, { Finish, timeOr } from "./finishOrder";

const at = (iso: string) => new Date(iso);
const sorted = (finals: Record<string, Finish>) =>
  Object.entries(finals)
    .sort(([, a], [, b]) => compareFinish(a, b))
    .map(([name]) => name);

describe("timeOr", () => {
  it("reads a date's time, and gives the fallback for none or one that does not parse", () => {
    expect(timeOr(at("2024-10-06T17:00Z"), 0)).toBe(Date.UTC(2024, 9, 6, 17));
    expect(timeOr(undefined, 1)).toBe(1);
    expect(timeOr(null, 2)).toBe(2);
    expect(timeOr(new Date("bad"), 3)).toBe(3);
  });
});

describe("compareFinish", () => {
  it("puts the earliest to end first", () => {
    expect(
      sorted({
        late: { finishedAt: at("2024-10-06T23:00Z") },
        early: { finishedAt: at("2024-10-06T20:00Z") },
      }),
    ).toEqual(["early", "late"]);
  });

  it("puts a game with no finish after every game with one, by kickoff", () => {
    expect(
      sorted({
        noPlays: { finishedAt: null, kickoff: at("2024-10-06T13:00Z") },
        notRead: { kickoff: at("2024-10-06T12:00Z") },
        ended: { finishedAt: at("2024-10-07T03:00Z") },
      }),
    ).toEqual(["ended", "notRead", "noPlays"]);
  });

  it("treats a time that does not parse as none, and a game with no time at all as last", () => {
    expect(
      sorted({
        noTime: {},
        badFinish: {
          finishedAt: new Date("bad"),
          kickoff: at("2024-10-06T13:00Z"),
        },
        ended: { finishedAt: at("2024-10-06T20:00Z") },
      }),
    ).toEqual(["ended", "badFinish", "noTime"]);
  });

  it("calls two games that end together, or have no time, a tie", () => {
    const end = at("2024-10-06T20:00Z");
    expect(compareFinish({ finishedAt: end }, { finishedAt: end })).toBe(0);
    expect(compareFinish({}, {})).toBe(0);
  });
});
