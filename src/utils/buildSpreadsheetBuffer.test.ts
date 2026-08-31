import * as XLSX from "xlsx-js-style";
import {
  PickResult,
  PlayerScore,
  RakMadnessScores,
  Status,
} from "../types/RakMadnessScores";
import buildSpreadsheetBuffer from "./buildSpreadsheetBuffer";

const WEEK = 5;
const SEASON = 2025;
const RESULTS_SHEET = `${SEASON} Week ${WEEK} Results`;
const PICKS_SHEET = `${SEASON} Week ${WEEK} Picks`;

/** What Excel refuses a sheet name past. */
const SHEET_NAME_LIMIT = 31;

// Fill colors that pickCell assigns per pick status.
const FILL_BY_STATUS = {
  yes: "A3FAA0",
  no: "FAA0A0",
  error: "EDFAA0",
  incomplete: "FFFFFF",
};

function pick(pickText: string, status: Status): PickResult {
  return {
    pick: pickText,
    status,
    explanation: { header: "Final Score", message: "KC 20 - 30 BUF" },
  };
}

function player(overrides: Partial<PlayerScore> = {}): PlayerScore {
  return {
    name: "Alice",
    score: { total: 3, college: 1, pro: 2, proAgainstTheSpread: 1 },
    tiebreaker: { pick: 41, distance: 0 },
    college: [pick("OSU -3", "yes"), pick("MICH +7", "no")],
    pro: [pick("BUF -7", "yes"), pick("DAL -3", "yes")],
    status: { hasNoPicks: false, isKnockedOut: false },
    ...overrides,
  };
}

const scores: RakMadnessScores = {
  tiebreaker: 41,
  scores: [
    player(),
    player({
      name: "Bob",
      score: { total: 1, college: 0, pro: 1, proAgainstTheSpread: 0 },
      tiebreaker: { pick: 45, distance: 4 },
      college: [pick("MICH +3", "no"), pick("PSU -7", "unscoreable")],
      pro: [pick("KC +7", "no"), pick("PHI +3", "incomplete")],
      status: { hasNoPicks: false, isKnockedOut: true },
    }),
  ],
};

async function readBack(
  scoresObject: RakMadnessScores = scores,
  weekNumber = WEEK,
  season = SEASON,
): Promise<XLSX.WorkBook> {
  const buffer = await buildSpreadsheetBuffer(scoresObject, {
    season,
    weekNumber,
  });
  return XLSX.read(buffer, { type: "array", cellStyles: true });
}

function rowsOf(workbook: XLSX.WorkBook, sheetName: string): Array<Array<any>> {
  return XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 });
}

describe("buildSpreadsheetBuffer, workbook shape", () => {
  it("writes a results sheet and a picks sheet named after the season and week", async () => {
    const workbook = await readBack();
    expect(workbook.SheetNames).toEqual([RESULTS_SHEET, PICKS_SHEET]);
  });

  it("names both sheets after whichever season and week it was given", async () => {
    const workbook = await readBack(scores, 12, 2024);
    expect(workbook.SheetNames).toEqual([
      "2024 Week 12 Results",
      "2024 Week 12 Picks",
    ]);
  });

  it("keeps both names inside the length Excel allows, at the longest week", async () => {
    const workbook = await readBack(scores, 18, 2025);
    for (const name of workbook.SheetNames) {
      expect(name.length).toBeLessThanOrEqual(SHEET_NAME_LIMIT);
    }
  });
});

describe("buildSpreadsheetBuffer, results sheet", () => {
  it("uses the expected header row", async () => {
    const workbook = await readBack();
    expect(rowsOf(workbook, RESULTS_SHEET)[0]).toEqual([
      "Rank",
      "Player",
      "MNF Points Pick",
      "MNF Points Distance",
      "College Score",
      "Pro Score",
      "Pro Score ATS",
      "Total Score",
    ]);
  });

  it("writes one row per player, ranked in the order given", async () => {
    const rows = rowsOf(await readBack(), RESULTS_SHEET);
    expect(rows[1]).toEqual([1, "Alice", 41, 0, 1, 2, 1, 3]);
    expect(rows[2]).toEqual([2, "Bob", 45, 4, 0, 1, 0, 1]);
  });

  it("writes N/A when a player has no tiebreaker pick or distance", async () => {
    const workbook = await readBack({
      tiebreaker: 41,
      scores: [
        player({
          tiebreaker: {
            pick: undefined as unknown as number,
            distance: undefined as unknown as number,
          },
        }),
      ],
    });
    const row = rowsOf(workbook, RESULTS_SHEET)[1];
    expect(row[2]).toBe("N/A");
    expect(row[3]).toBe("N/A");
  });

  it("sets a column width for every results column", async () => {
    const workbook = await readBack();
    expect(workbook.Sheets[RESULTS_SHEET]["!cols"]).toHaveLength(8);
  });
});

describe("buildSpreadsheetBuffer, picks sheet", () => {
  it("labels one column per pick, sized from the first player", async () => {
    const workbook = await readBack();
    expect(rowsOf(workbook, PICKS_SHEET)[0]).toEqual([
      "Rank",
      "Player",
      "C1",
      "C2",
      "College Score",
      "P1",
      "P2",
      "Pro Score",
      "Total Score",
    ]);
  });

  it("writes each pick alongside the running college, pro, and total scores", async () => {
    const rows = rowsOf(await readBack(), PICKS_SHEET);
    expect(rows[1]).toEqual([
      1,
      "Alice",
      "OSU -3",
      "MICH +7",
      1,
      "BUF -7",
      "DAL -3",
      2,
      3,
    ]);
  });

  it("colors each pick cell by its status", async () => {
    const sheet = (await readBack()).Sheets[PICKS_SHEET];
    // Reading a workbook back flattens the fill onto the style itself.
    const fillOf = (address: string) => sheet[address].s.fgColor.rgb;
    // Row 3 is Bob: C1 no, C2 error, P1 no, P2 incomplete.
    expect(fillOf("C3")).toBe(FILL_BY_STATUS.no);
    expect(fillOf("D3")).toBe(FILL_BY_STATUS.error);
    expect(fillOf("F3")).toBe(FILL_BY_STATUS.no);
    expect(fillOf("G3")).toBe(FILL_BY_STATUS.incomplete);
    // Row 2 is Alice, whose college picks are one correct and one wrong.
    expect(fillOf("C2")).toBe(FILL_BY_STATUS.yes);
    expect(fillOf("D2")).toBe(FILL_BY_STATUS.no);
  });

  it("writes N/A for a missing pick", async () => {
    const workbook = await readBack({
      tiebreaker: 41,
      scores: [
        player({
          college: [
            pick(undefined as unknown as string, "unscoreable"),
            pick("MICH +7", "no"),
          ],
        }),
      ],
    });
    expect(rowsOf(workbook, PICKS_SHEET)[1][2]).toBe("N/A");
  });

  it("sets a column width for every picks column", async () => {
    const workbook = await readBack();
    expect(workbook.Sheets[PICKS_SHEET]["!cols"]).toHaveLength(9);
  });
});
