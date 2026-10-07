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
    savePreset("rivals", ["Bob"]);
    savePreset("Family", ["Alice"]);

    expect(readPresets().map(({ name }) => name)).toEqual(["Family", "rivals"]);
  });

  it("replaces a preset saved under the same name in any case", () => {
    savePreset("Family", ["Alice"]);

    expect(savePreset(" family ", ["Bob", "Carol"])).toEqual([
      { name: "family", players: ["Bob", "Carol"] },
    ]);
    expect(readPresets()).toEqual([
      { name: "family", players: ["Bob", "Carol"] },
    ]);
  });

  it("deletes a preset by name in any case, and forgets the last one", () => {
    savePreset("Family", ["Alice"]);
    savePreset("Rivals", ["Bob"]);

    expect(deletePreset("FAMILY")).toEqual([
      { name: "Rivals", players: ["Bob"] },
    ]);
    deletePreset("rivals");
    expect(localStorage.getItem(PRESETS_KEY)).toBeNull();
  });

  it("renames a preset, keeping its players", () => {
    savePreset("Family", ["Alice"]);
    savePreset("Rivals", ["Bob"]);

    expect(renamePreset("family", " Kin ")).toEqual([
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
    expect(savePreset(`  ${long}`, ["Alice"])).toEqual([
      { name: long.slice(0, MAX_PRESET_NAME), players: ["Alice"] },
    ]);
    expect(renamePreset(long.slice(0, MAX_PRESET_NAME), `B${long}`)).toEqual([
      { name: `B${long}`.slice(0, MAX_PRESET_NAME), players: ["Alice"] },
    ]);
  });
});
