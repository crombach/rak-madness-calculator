// A capped, prefixed corner of localStorage, shared by the caches built on one.
//
// Everything kept this way is something a page load can do without, so a read or a
// write that fails counts as a miss and never as an error. A failure of either clears
// the cache. Storage this browser cannot be trusted with is better left empty than
// left half full.

export type LocalStorageCache<T> = {
  /** The value stored under a name, or undefined for one this browser does not have. */
  read: (name: string) => T | undefined;
  write: (name: string, value: T) => void;
};

export default function localStorageCache<T>(options: {
  /** What every key of this cache starts with, which a prune and a clear go by. */
  prefix: string;
  /** How many entries to keep. A size guard, not a history. */
  cap: number;
  /** Names this cache in a warning. */
  label: string;
  encode: (value: T) => string;
  decode: (text: string) => T;
}): LocalStorageCache<T> {
  const { prefix, cap, label, encode, decode } = options;

  function ownKeys(): Array<string> {
    const keys: Array<string> = [];
    for (let index = 0; index < localStorage.length; index++) {
      const key = localStorage.key(index);
      if (key?.startsWith(prefix)) {
        keys.push(key);
      }
    }
    return keys;
  }

  function clear(): void {
    try {
      ownKeys().forEach((key) => localStorage.removeItem(key));
    } catch (error) {
      // Called from the catch blocks below, which turn a storage failure into a miss.
      // If storage is blocked outright, this must not throw past them.
      console.warn(`Could not clear the ${label} cache`, error);
    }
  }

  return {
    read(name) {
      try {
        const text = localStorage.getItem(prefix + name);
        return text != null ? decode(text) : undefined;
      } catch (error) {
        console.warn(`Could not read the ${label} cache`, error);
        clear();
        return undefined;
      }
    },

    write(name, value) {
      const key = prefix + name;
      try {
        // Pruned before writing, so the entry being written is never the one dropped.
        // localStorage does not report insertion order, so which others go is arbitrary.
        const keys = ownKeys().filter((it) => it !== key);
        keys
          .slice(0, Math.max(keys.length - (cap - 1), 0))
          .forEach((it) => localStorage.removeItem(it));
        localStorage.setItem(key, encode(value));
      } catch (error) {
        console.warn(`Could not write the ${label} cache`, error);
        clear();
      }
    },
  };
}
