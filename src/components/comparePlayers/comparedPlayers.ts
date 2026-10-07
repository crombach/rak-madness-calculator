import { PREFIX, readSetting, writeSetting } from "../../utils/settingsStore";

const SETTING = "comparedPlayers";

/** The exact key the chosen names are saved under, for a test to seed or read. */
export const COMPARED_PLAYERS_KEY = PREFIX + SETTING;

/** The fewest pickers the page shows, padded up to when no name was saved. */
export const MIN_PICKERS = 1;

/** The fewest players with picks whose games can split or agree. */
export const MIN_SCOPED = 2;

/** The most players the page compares at once. */
export const MAX_PICKERS = 10;

/** The names last chosen, in picker order. Empty when none were saved. */
export function readComparedPlayers(): Array<string> {
  try {
    const saved: unknown = JSON.parse(readSetting(SETTING) ?? "[]");
    return Array.isArray(saved)
      ? saved.filter((name) => typeof name === "string").slice(0, MAX_PICKERS)
      : [];
  } catch {
    return [];
  }
}

/** Saves the names chosen, or forgets them when there are none. */
export function writeComparedPlayers(names: Array<string>): void {
  writeSetting(SETTING, names.length > 0 ? JSON.stringify(names) : "");
}

/** Whether two names are one, so a name re-cased between weeks still matches. */
export function isSameName(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

/** Players saved under a name the reader chose, in picker order. */
export type Preset = { name: string; players: Array<string> };

const PRESETS_SETTING = "comparePresets";

/** The exact key the presets are saved under, for a test to seed or read. */
export const PRESETS_KEY = PREFIX + PRESETS_SETTING;

const byName = (a: Preset, b: Preset) => a.name.localeCompare(b.name);

function isPreset(saved: unknown): saved is Preset {
  return (
    typeof saved === "object" &&
    saved != null &&
    "name" in saved &&
    typeof saved.name === "string" &&
    saved.name.trim() !== "" &&
    "players" in saved &&
    Array.isArray(saved.players)
  );
}

/** The saved presets, by name. Empty when none were saved. */
export function readPresets(): Array<Preset> {
  try {
    const saved: unknown = JSON.parse(readSetting(PRESETS_SETTING) ?? "[]");
    if (!Array.isArray(saved)) return [];
    return saved
      .filter(isPreset)
      .map(({ name, players }) => ({
        name,
        players: players
          .filter((player) => typeof player === "string")
          .slice(0, MAX_PICKERS),
      }))
      .filter(
        (preset, index, all) =>
          all.findIndex((other) => isSameName(other.name, preset.name)) ===
          index,
      )
      .sort(byName);
  } catch {
    return [];
  }
}

/** Saves the presets, returned by name even when storage refuses them. */
function writePresets(presets: Array<Preset>): Array<Preset> {
  writeSetting(
    PRESETS_SETTING,
    presets.length > 0 ? JSON.stringify(presets) : "",
  );
  return [...presets].sort(byName);
}

/** Saves the players under the name, replacing a preset of that name. */
export function savePreset(name: string, players: Array<string>) {
  const others = readPresets().filter(
    (preset) => !isSameName(preset.name, name),
  );
  return writePresets([...others, { name: name.trim(), players }]);
}

/** Forgets the preset of that name. */
export function deletePreset(name: string) {
  return writePresets(
    readPresets().filter((preset) => !isSameName(preset.name, name)),
  );
}

/** Which games the table shows, in the order the toggle offers them. */
export const GAME_SCOPES = ["all", "different", "same"] as const;
export type GameScope = (typeof GAME_SCOPES)[number];

const DEFAULT_SCOPE: GameScope = "all";
const SCOPE_SETTING = "compareGameScope";

/** The exact key the game scope is saved under, for a test to seed or read. */
export const GAME_SCOPE_KEY = PREFIX + SCOPE_SETTING;

/** The game scope last chosen, or All. */
export function readGameScope(): GameScope {
  const saved = readSetting(SCOPE_SETTING);
  return GAME_SCOPES.find((scope) => scope === saved) ?? DEFAULT_SCOPE;
}

/** Saves the game scope, or forgets it for the default. */
export function writeGameScope(scope: GameScope): void {
  writeSetting(SCOPE_SETTING, scope === DEFAULT_SCOPE ? "" : scope);
}

const LEADER_SETTING = "compareLeader";
const LEADER_ON = "on";

/** The exact key the leader toggle is saved under, for a test to seed or read. */
export const LEADER_KEY = PREFIX + LEADER_SETTING;

/** Whether the week's leader joins the players chosen, off unless saved on. */
export function readShowsLeader(): boolean {
  return readSetting(LEADER_SETTING) === LEADER_ON;
}

/** Saves the leader toggle, or forgets it when off. */
export function writeShowsLeader(on: boolean): void {
  writeSetting(LEADER_SETTING, on ? LEADER_ON : "");
}

/** A picker's label and accessible name, counted from 1. */
export function pickerLabel(index: number): string {
  return `Player ${index + 1}`;
}
