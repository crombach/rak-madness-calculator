// A per-week copy of an uploaded workbook, so a results URL can be reopened
// without asking for the file again. Only the workbook is cached, never the
// scores: recomputing those is fast, and a cached score could go stale against a
// change to the scoring rules.

import localStorageCache from "./localStorageCache";

/** Picks files are tens of KB. */
const MAX_CACHED_WEEKS = 3;
// Encoding the whole buffer in one call overflows the argument list, so it goes
// through in slices.
const BASE64_CHUNK_BYTES = 8192;

function toBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let text = "";
  for (let offset = 0; offset < bytes.length; offset += BASE64_CHUNK_BYTES) {
    text += String.fromCharCode(
      ...bytes.subarray(offset, offset + BASE64_CHUNK_BYTES),
    );
  }
  return btoa(text);
}

function fromBase64(text: string): ArrayBuffer {
  const binary = atob(text);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index++) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes.buffer;
}

const workbooks = localStorageCache<ArrayBuffer>({
  prefix: "rak-madness:picks:",
  cap: MAX_CACHED_WEEKS,
  label: "picks",
  encode: toBase64,
  decode: fromBase64,
});

/** The cached workbook for a week, or undefined if there isn't a usable one. */
export function readCachedPicks(
  season: number,
  weekNumber: number,
): ArrayBuffer | undefined {
  return workbooks.read(`${season}:${weekNumber}`);
}

export function writeCachedPicks(
  season: number,
  weekNumber: number,
  buffer: ArrayBuffer,
): void {
  workbooks.write(`${season}:${weekNumber}`, buffer);
}
