import {
  PickResult,
  PlayerScore,
  RakMadnessScores,
} from "../types/RakMadnessScores";
import {
  PICK_STATUS_FILL,
  PLAYER_STATUS_FILL,
  PlayerStanding,
} from "./pickStatusFill";
import rangeWithPrefix from "./rangeWithPrefix";
import { fillStatus } from "./scoring/getPickResults";
import repeatedNames from "./scoring/repeatedNames";

/** Keep in sync with the header `functions/api/picks/[season]/[week].ts` responds with. */
export const XLSX_CONTENT_TYPE =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

const Color = {
  WHITE: {
    rgb: "FFFFFF",
  },
  OFF_BLACK: {
    rgb: "111111",
  },
};

const Border = {
  HEADER: {
    style: "thin",
    color: Color.WHITE,
  },
  NORMAL: {
    style: "thin",
    color: Color.OFF_BLACK,
  },
};

enum CellType {
  Number = "n",
  Text = "s",
}

function allSides(border: (typeof Border)[keyof typeof Border]) {
  return {
    left: border,
    right: border,
    top: border,
    bottom: border,
  };
}

function headerCell(value: string) {
  return {
    v: value,
    s: {
      font: {
        bold: true,
        color: Color.WHITE,
      },
      fill: {
        patternType: "solid",
        fgColor: Color.OFF_BLACK,
      },
      border: allSides(Border.HEADER),
    },
  };
}

function pickCell(result: PickResult) {
  const cellColor = PICK_STATUS_FILL[fillStatus(result)];

  return {
    t: CellType.Text,
    v: result.pick ?? "N/A",
    s: {
      alignment: {
        horizontal: "center",
      },
      fill: {
        patternType: "solid",
        fgColor: cellColor,
      },
      border: allSides(Border.NORMAL),
    },
  };
}

/**
 * Where a player stands, in the order the tables settle it. A shared name comes
 * first: neither row can be told from the other, so no standing read off that name
 * belongs to either of them.
 */
function standingOf(
  player: PlayerScore,
  repeated: Set<string>,
  showStatus: boolean,
): PlayerStanding {
  if (repeated.has(player.name)) return "nameConflict";
  if (!showStatus) return "noStatus";
  return player.status.isKnockedOut ? "knockedOut" : "inContention";
}

function playerNameCell(player: PlayerScore, standing: PlayerStanding) {
  return {
    t: CellType.Text,
    v: player.name,
    s: {
      alignment: {
        horizontal: "left",
      },
      fill: {
        patternType: "solid",
        fgColor: PLAYER_STATUS_FILL[standing],
      },
      border: allSides(Border.NORMAL),
    },
  };
}

function normalCell({
  value,
  alignment = "right",
  isBold = false,
}: {
  value: string | number;
  alignment?: "right" | "left" | "center";
  isBold?: boolean;
}) {
  const cellType = typeof value === "number" ? CellType.Number : CellType.Text;
  return {
    t: cellType,
    v: value,
    s: {
      alignment: {
        horizontal: alignment,
      },
      font: {
        bold: isBold,
      },
      fill: {
        patternType: "solid",
        fgColor: Color.WHITE,
      },
      border: allSides(Border.NORMAL),
    },
  };
}

/**
 * A tab's name, which Excel refuses past 31 characters.
 *
 * The pool's own name is left off. `Rak Madness 2025 Week 5 Results` is exactly 31
 * and week 10 is over it, and the workbook it is a tab of is already named after
 * the pool.
 */
function sheetName(season: number, weekNumber: number, view: string): string {
  return `${season} Week ${weekNumber} ${view}`;
}

/**
 * `xlsx-js-style` is over half the bundle, and an export is a deliberate click, so
 * it is fetched at that point rather than on load.
 */
export default async function buildSpreadsheetBuffer(
  scoresObject: RakMadnessScores,
  // Named rather than positional. Two numbers side by side, and a call with them
  // the wrong way round would come out as a workbook for week 2025.
  {
    season,
    weekNumber,
    // Whether the week's standings are settled enough to say, which the caller
    // reads off `useShowPlayerStatus` so the workbook says what the screen does.
    // A shared name is marked either way, since that is the sheet and not the week.
    showStatus = false,
  }: { season: number; weekNumber: number; showStatus?: boolean },
): Promise<ArrayBuffer> {
  const XLSX = await import("xlsx-js-style");
  const workbook = XLSX.utils.book_new();
  const repeated = repeatedNames(scoresObject.scores);

  const resultsData = [
    [
      headerCell("Rank"),
      headerCell("Player"),
      headerCell("MNF Points Pick"),
      headerCell("MNF Points Distance"),
      headerCell("College Score"),
      headerCell("Pro Score"),
      headerCell("Pro Score ATS"),
      headerCell("Total Score"),
    ],
    ...scoresObject.scores.map((player, index) => {
      return [
        normalCell({ value: index + 1, alignment: "left", isBold: true }),
        playerNameCell(player, standingOf(player, repeated, showStatus)),
        normalCell({ value: player.tiebreaker.pick ?? "N/A" }),
        normalCell({ value: player.tiebreaker.distance ?? "N/A" }),
        normalCell({ value: player.score.college }),
        normalCell({ value: player.score.pro }),
        normalCell({ value: player.score.proAgainstTheSpread }),
        normalCell({ value: player.score.total, isBold: true }),
      ];
    }),
  ];

  const resultsSheet = XLSX.utils.aoa_to_sheet(resultsData);
  resultsSheet["!cols"] = [
    { wch: 5 },
    { wch: 22 },
    { wch: 14 },
    { wch: 18 },
    { wch: 12 },
    { wch: 9 },
    { wch: 25 },
    { wch: 10 },
  ];
  XLSX.utils.book_append_sheet(
    workbook,
    resultsSheet,
    sheetName(season, weekNumber, "Results"),
  );

  const firstPlayer = scoresObject.scores[0];
  const collegeCount = firstPlayer.college.length;
  const proCount = firstPlayer.pro.length;
  const picksData = [
    [
      headerCell("Rank"),
      headerCell("Player"),
      ...rangeWithPrefix(collegeCount, "C").map((value) => headerCell(value)),
      headerCell("College Score"),
      ...rangeWithPrefix(proCount, "P").map((value) => headerCell(value)),
      headerCell("Pro Score"),
      headerCell("Total Score"),
    ],
    ...scoresObject.scores.map((player, index) => {
      return [
        normalCell({ value: index + 1, alignment: "left", isBold: true }),
        playerNameCell(player, standingOf(player, repeated, showStatus)),
        ...player.college.map(pickCell),
        normalCell({ value: player.score.college, alignment: "center" }),
        ...player.pro.map(pickCell),
        normalCell({ value: player.score.pro, alignment: "center" }),
        normalCell({
          value: player.score.total,
          alignment: "center",
          isBold: true,
        }),
      ];
    }),
  ];

  const picksSheet = XLSX.utils.aoa_to_sheet(picksData);
  picksSheet["!cols"] = [
    { wch: 5 },
    { wch: 22 },
    ...rangeWithPrefix(collegeCount).map(() => ({ wch: 10 })),
    { wch: 12 },
    ...rangeWithPrefix(proCount).map(() => ({ wch: 10 })),
    { wch: 9 },
    { wch: 10 },
  ];
  XLSX.utils.book_append_sheet(
    workbook,
    picksSheet,
    sheetName(season, weekNumber, "Picks"),
  );

  return XLSX.write(workbook, { type: "array" });
}
