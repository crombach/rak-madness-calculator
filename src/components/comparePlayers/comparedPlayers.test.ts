import {
  COMPARED_PLAYERS_KEY,
  GAME_SCOPE_KEY,
  MAX_PICKERS,
  MAX_PRESET_NAME,
  PRESETS_KEY,
  deletePreset,
  readComparedPlayers,
  readGameScope,
  readPresets,
  renamePreset,
  savePreset,
} from "./comparedPlayers";

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

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

describe("presets", () => {
  it.each([
    ["text that is not JSON", "{oops"],
    ["JSON that is not a list", '{"a":1}'],
  ])("reads %s as no presets", (_, saved) => {
    localStorage.setItem(PRESETS_KEY, saved);

    expect(readPresets()).toEqual([]);
  });

  it("drops malformed presets, and players beyond what the page compares", () => {
    const names = Array.from({ length: 12 }, (_, index) => `P${index}`);
    localStorage.setItem(
      PRESETS_KEY,
      JSON.stringify([
        null,
        { name: 1, players: ["Alice"] },
        { name: "No list", players: "Alice" },
        { name: "Many", players: [1, ...names] },
      ]),
    );

    expect(readPresets()).toEqual([
      { name: "Many", players: names.slice(0, MAX_PICKERS) },
    ]);
  });

  it("lists presets by name", () => {
    savePreset(readPresets(), "rivals", ["Bob"]);
    savePreset(readPresets(), "Family", ["Alice"]);

    expect(readPresets().map(({ name }) => name)).toEqual(["Family", "rivals"]);
  });

  it("replaces a preset saved under the same name in any case", () => {
    savePreset(readPresets(), "Family", ["Alice"]);

    expect(savePreset(readPresets(), " family ", ["Bob", "Carol"])).toEqual([
      { name: "family", players: ["Bob", "Carol"] },
    ]);
    expect(readPresets()).toEqual([
      { name: "family", players: ["Bob", "Carol"] },
    ]);
  });

  it("deletes a preset by name in any case, and forgets the last one", () => {
    savePreset(readPresets(), "Family", ["Alice"]);
    savePreset(readPresets(), "Rivals", ["Bob"]);

    expect(deletePreset(readPresets(), "FAMILY")).toEqual([
      { name: "Rivals", players: ["Bob"] },
    ]);
    deletePreset(readPresets(), "rivals");
    expect(localStorage.getItem(PRESETS_KEY)).toBeNull();
  });

  it("renames a preset, keeping its players", () => {
    savePreset(readPresets(), "Family", ["Alice"]);
    savePreset(readPresets(), "Rivals", ["Bob"]);

    expect(renamePreset(readPresets(), "family", " Kin ")).toEqual([
      { name: "Kin", players: ["Alice"] },
      { name: "Rivals", players: ["Bob"] },
    ]);
    expect(readPresets()).toEqual([
      { name: "Kin", players: ["Alice"] },
      { name: "Rivals", players: ["Bob"] },
    ]);
  });

  it("cuts a preset's name to the longest it takes", () => {
    const long = "A".repeat(MAX_PRESET_NAME + 4);
    localStorage.setItem(
      PRESETS_KEY,
      JSON.stringify([{ name: long, players: ["Bob"] }]),
    );

    expect(readPresets()).toEqual([
      { name: long.slice(0, MAX_PRESET_NAME), players: ["Bob"] },
    ]);
    expect(savePreset(readPresets(), `  ${long}`, ["Alice"])).toEqual([
      { name: long.slice(0, MAX_PRESET_NAME), players: ["Alice"] },
    ]);
    expect(
      renamePreset(readPresets(), long.slice(0, MAX_PRESET_NAME), `B${long}`),
    ).toEqual([
      { name: `B${long}`.slice(0, MAX_PRESET_NAME), players: ["Alice"] },
    ]);
  });

  it("drops a space the cut leaves at a name's end", () => {
    const name = `${"A".repeat(MAX_PRESET_NAME - 1)} Bee`;

    expect(savePreset(readPresets(), name, ["Bob"])).toEqual([
      { name: "A".repeat(MAX_PRESET_NAME - 1), players: ["Bob"] },
    ]);
  });

  it("drops a preset with no player's name", () => {
    localStorage.setItem(
      PRESETS_KEY,
      JSON.stringify([
        { name: "Empty", players: [] },
        { name: "Numbers", players: [1, 2] },
        { name: "Kin", players: ["Bob"] },
      ]),
    );

    expect(readPresets()).toEqual([{ name: "Kin", players: ["Bob"] }]);
  });

  it("keeps every change in the list when storage refuses it", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("full", "QuotaExceededError");
    });
    vi.spyOn(console, "warn").mockImplementation(() => {});

    const saved = savePreset(savePreset([], "Family", ["Alice"]), "Rivals", [
      "Bob",
    ]);

    expect(saved).toEqual([
      { name: "Family", players: ["Alice"] },
      { name: "Rivals", players: ["Bob"] },
    ]);
    expect(
      deletePreset(renamePreset(saved, "Family", "Kin"), "Rivals"),
    ).toEqual([{ name: "Kin", players: ["Alice"] }]);
  });
});
