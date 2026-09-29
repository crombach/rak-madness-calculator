import parsePick, { formatPickDisplay } from "./parsePick";

describe("parsePick", () => {
  it.each([
    ["BUF -7", "BUF", -7],
    ["KC +3.5", "KC", 3.5],
    ["NE 7", "NE", 7],
    ["SF", "SF", 0],
    ["M-OH -7", "M-OH", -7],
    ["M-OH", "M-OH", 0],
    ["buf -7", "BUF", -7],
    ["undefined", undefined, 0],
    ["BUF - 7", "BUF", -7],
    ["  BUF -7  ", "BUF", -7],
  ])("parses %p to team %p and spread %p", (input, team, spread) => {
    expect(parsePick(input)).toEqual({
      teamAbbreviation: team,
      spread,
    });
  });

  it("reads an abbreviation that opens with a digit", () => {
    expect(parsePick("49ERS -3")).toEqual({
      teamAbbreviation: "49ERS",
      spread: -3,
    });
  });

  it("keeps the space in an abbreviation of two words", () => {
    expect(parsePick("OLE MISS -3")).toEqual({
      teamAbbreviation: "OLE MISS",
      spread: -3,
    });
    expect(parsePick("K ST")).toEqual({
      teamAbbreviation: "K ST",
      spread: 0,
    });
  });

  it("drops a hyphen left over from a spread written without a space", () => {
    expect(parsePick("BUF--7")).toEqual({
      teamAbbreviation: "BUF",
      spread: -7,
    });
  });

  it("names no team for a cell holding no team, rather than throwing", () => {
    ["", " ", "+", "-", "7"].forEach((cell) => {
      expect(parsePick(cell).teamAbbreviation).toBeUndefined();
    });
  });

  it("reports a spread written with no team in front of it", () => {
    // Harmless, because a pick naming no team is unscoreable either way, and the
    // spread of an unscoreable pick is never added up.
    expect(parsePick("-7")).toEqual({
      teamAbbreviation: undefined,
      spread: -7,
    });
  });
});

describe("formatPickDisplay", () => {
  it("puts a + on a spread written with no sign", () => {
    expect(formatPickDisplay("NE 7")).toBe("NE +7");
  });

  it("leaves a spread that already carries a sign untouched", () => {
    expect(formatPickDisplay("BUF -7")).toBe("BUF -7");
    expect(formatPickDisplay("KC +3.5")).toBe("KC +3.5");
  });

  it("leaves a pick with no spread untouched", () => {
    expect(formatPickDisplay("SF")).toBe("SF");
  });

  it("leaves a pick naming no team untouched", () => {
    expect(formatPickDisplay("-7")).toBe("-7");
  });

  it("leaves a non-string cell untouched", () => {
    expect(formatPickDisplay(undefined)).toBeUndefined();
  });
});
