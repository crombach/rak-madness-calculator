import { readFileSync } from "node:fs";
import { Status } from "../types/RakMadnessScores";
import { PICK_STATUS_FILL } from "./pickStatusFill";

/** The token each status is drawn from in the browser. */
const TOKEN_FOR_STATUS: Record<Status, string> = {
  yes: "--rak-success-300",
  no: "--rak-danger-300",
  unscoreable: "--rak-warning-300",
  incomplete: "--rak-surface",
};

function tokenValues(): Map<string, string> {
  const stylesheet = readFileSync("src/index.scss", "utf8");
  // The export is a static file with no concept of the reader's theme, so it has
  // to match the light-mode base rather than the dark override of it. The base is
  // everything before the first `@media` or `@mixin`, the two shapes an override
  // is written in, so a brace-matching regex isn't needed and can't be fooled by
  // how deeply a future one nests.
  const lightModeOnly = stylesheet.split(/@media|@mixin/)[0];
  return new Map(
    Array.from(
      lightModeOnly.matchAll(/(--rak-[a-z0-9-]+):\s*(#[0-9a-fA-F]{3,6})\s*;/g),
      ([, token, value]) => [token, value.toLowerCase()],
    ),
  );
}

/** `#fff` and `#ffffff` are the same color, and the stylesheet may write either. */
function expand(hex: string): string {
  const digits = hex.slice(1);
  return digits.length === 3
    ? digits
        .split("")
        .map((digit) => digit + digit)
        .join("")
    : digits;
}

describe("PICK_STATUS_FILL", () => {
  // The export writes bare hex for xlsx and the stylesheet needs a CSS color, so the
  // value is written twice on purpose. This is what stops the two drifting apart.
  it("fills a status with the same color the browser draws it in", () => {
    const tokens = tokenValues();

    Object.entries(TOKEN_FOR_STATUS).forEach(([status, token]) => {
      const declared = tokens.get(token);
      expect(
        declared,
        `${token} is not declared in src/index.scss`,
      ).toBeDefined();
      expect(
        PICK_STATUS_FILL[status as Status].rgb.toLowerCase(),
        `${status} should match ${token}`,
      ).toBe(expand(declared as string));
    });
  });

  it("covers every status a pick can have", () => {
    expect(Object.keys(PICK_STATUS_FILL).sort()).toEqual(
      Object.keys(TOKEN_FOR_STATUS).sort(),
    );
  });
});
