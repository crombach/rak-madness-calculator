// The reader's own preferences, under one prefix of localStorage.
//
// Deliberately not `localStorageCache`, which every other store here is built on.
// That one is capped and clears its whole prefix the moment a read or a write
// fails, which is right for something a page load can refetch and wrong for a
// value the reader typed. A failure here is a miss for that one name, and the
// names beside it are left alone.

export const PREFIX = "rak-madness:settings:";

/** The value saved under a name, or undefined for one never set. */
export function readSetting(name: string): string | undefined {
  try {
    return localStorage.getItem(PREFIX + name) ?? undefined;
  } catch (error) {
    console.warn(`Could not read the ${name} setting`, error);
    return undefined;
  }
}

/** Saves a value, or forgets the setting when the value is empty. */
export function writeSetting(name: string, value: string): void {
  try {
    if (value === "") {
      localStorage.removeItem(PREFIX + name);
    } else {
      localStorage.setItem(PREFIX + name, value);
    }
  } catch (error) {
    console.warn(`Could not save the ${name} setting`, error);
  }
}
