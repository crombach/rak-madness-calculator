import {
  COMPARED_PLAYERS_KEY,
  GAME_SCOPE_KEY,
  MAX_PICKERS,
  readComparedPlayers,
  readGameScope,
} from "./comparedPlayers";

afterEach(() => localStorage.clear());

describe("readComparedPlayers", () => {
  it.each([
    ["text that is not JSON", "{oops"],
    ["JSON that is not a list", '{"a":1}'],
  ])("reads %s as no names", (_, saved) => {
    localStorage.setItem(COMPARED_PLAYERS_KEY, saved);

    expect(readComparedPlayers()).toEqual([]);
  });

  it("keeps only the names, and no more than the page compares", () => {
    const names = Array.from({ length: 12 }, (_, index) => `P${index}`);
    localStorage.setItem(
      COMPARED_PLAYERS_KEY,
      JSON.stringify([1, null, ...names]),
    );

    expect(readComparedPlayers()).toEqual(names.slice(0, MAX_PICKERS));
  });
});

describe("readGameScope", () => {
  it("falls back to every game for a scope it does not know", () => {
    localStorage.setItem(GAME_SCOPE_KEY, "bogus");

    expect(readGameScope()).toBe("all");
  });
});
