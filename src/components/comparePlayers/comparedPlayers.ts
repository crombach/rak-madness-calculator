import { PREFIX, readSetting, writeSetting } from "../../utils/settingsStore";

const SETTING = "comparedPlayers";

/** The exact key the chosen names are saved under, for a test to seed or read. */
export const COMPARED_PLAYERS_KEY = PREFIX + SETTING;

/** How many pickers the page opens with, however few names were saved. */
export const MIN_PICKERS = 2;

/** The most players the page compares at once. */
export const MAX_PICKERS = 8;

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

/** A picker's label and accessible name, counted from 1. */
export function pickerLabel(index: number): string {
  return `Player ${index + 1}`;
}
