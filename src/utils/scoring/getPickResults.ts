import { GameStatus, HomeAway } from "../../types/ESPN";
import { GameScore } from "../../types/GameScore";
import { LeagueResult } from "../../types/LeagueResult";
import { Status } from "../../types/RakMadnessScores";
import debugLog from "../debugLog";
import marginAgainstSpread from "./marginAgainstSpread";
import parsePick from "./parsePick";

/**
 * Built once. `toLocaleTimeString` mints a formatter per call, and a week of
 * upcoming games formats one per pick of every player.
 */
const KICKOFF_TIME = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
});
const KICKOFF_DATE = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
});

export function getStatus(score: GameScore): Status {
  if (score.isUnscoreable) {
    return "unscoreable";
  } else if (!score.isFinal) {
    return "incomplete";
  } else if (score.pointValue === 1) {
    return "yes";
  }
  return "no";
}

/**
 * The header a cell left blank carries. Held apart from the other two because it is
 * the player's own doing rather than a game nobody can score. Every week has blanks
 * in it, and a week full of them is still a week that finished.
 */
export const MISSING_PICK = "Missing Pick";

/**
 * A pick with no point in it either way. Every reason a game cannot be scored ends
 * here, and they share `isUnscoreable` because they share that outcome. Only the
 * explanation differs, since only the user can act on the difference.
 */
function unscoreable(
  header: string,
  message: string,
  hasSpread: boolean,
): GameScore {
  return {
    pointValue: 0,
    explanation: { header, message },
    isUnscoreable: true,
    isFinal: false,
    hasSpread,
  };
}

/** What the text in one cell scores against a week. */
function scoreCell(
  pick: string,
  resultsByTeam: Map<string, LeagueResult>,
): GameScore {
  const { teamAbbreviation: selectedTeam, spread } = parsePick(pick);
  const hasSpread = spread !== 0;

  if (selectedTeam == null) {
    return unscoreable(
      MISSING_PICK,
      "No pick was made for this game.",
      hasSpread,
    );
  }

  const gameResult = resultsByTeam.get(selectedTeam);
  if (!gameResult) {
    console.warn(
      "FAILED to find game result for team abbreviation:",
      selectedTeam,
    );
    return unscoreable(
      "Missing Game",
      `Unable to find game result for team with abbreviation ${selectedTeam}`,
      hasSpread,
    );
  }

  // From the picked team's side, since the cell's spread is written from it.
  // A push counts as a win (>= not >). `pointValue` unread until `isFinal`.
  const margin = marginAgainstSpread(gameResult, selectedTeam, spread);
  const pointValue = margin >= 0 ? 1 : 0;
  debugLog("scored pick", {
    selectedTeam,
    spread,
    winnerBy: gameResult.winner.by,
    marginAgainstSpread: margin,
    pointValue,
  });

  let explanationHeader: string;
  switch (gameResult.status) {
    case GameStatus.FINAL: {
      explanationHeader = "Final Score";
      break;
    }
    case GameStatus.UPCOMING: {
      explanationHeader = "Upcoming";
      break;
    }
    default: {
      explanationHeader = `Live Score | ${gameResult.detailMessage}`;
      break;
    }
  }

  return {
    pointValue,
    explanation: {
      header: explanationHeader,
      message:
        gameResult.status === GameStatus.UPCOMING
          ? `${gameResult.away.team.abbreviation} @ ${gameResult.home.team.abbreviation}` +
            ` begins at ${KICKOFF_TIME.format(gameResult.date)}` +
            ` on ${KICKOFF_DATE.format(gameResult.date)}.`
          : `${gameResult.possession.homeAway === HomeAway.AWAY ? "▸ " : ""}${gameResult.away.team.abbreviation} ${gameResult.away.score}` +
            ` - ` +
            `${gameResult.home.score} ${gameResult.home.team.abbreviation}${gameResult.possession.homeAway === HomeAway.HOME ? " ◂" : ""}`,
      downDistanceText:
        gameResult.possession.homeAway != null
          ? gameResult.possession.downDistanceText
          : "",
    },
    isUnscoreable: false,
    isFinal: gameResult.status === GameStatus.FINAL,
    hasSpread,
  };
}

/**
 * What one cell scores against a week, by the text in it.
 *
 * A cell says nothing about who wrote it, so every row that picked a game the same
 * way scores it the same way, and a week of eighty rows holds only as many distinct
 * cells as it has games and sides. Held against the index the week was built from,
 * so a new week is a new answer and the old one goes when the index does.
 */
const scoredCells = new WeakMap<
  Map<string, LeagueResult>,
  Map<string, GameScore>
>();

/**
 * Takes the index rather than the games, so scoring builds it once per week.
 *
 * `spreadDisagreements` maps a position in `picks` to the workbook's own
 * contradiction about that game's spread. A game described two ways scores for
 * nobody, so the whole column comes back unscoreable rather than resolving the
 * contradiction one way and quietly handing out points on it.
 */
export function getPickResults(
  picks: Array<string>,
  resultsByTeam: Map<string, LeagueResult>,
  spreadDisagreements: Map<number, string> = new Map(),
): Array<GameScore> {
  let scored = scoredCells.get(resultsByTeam);
  if (scored == null) {
    scored = new Map();
    scoredCells.set(resultsByTeam, scored);
  }
  return picks.map((pick: string, index: number) => {
    const spreadDisagreement = spreadDisagreements.get(index);
    if (spreadDisagreement != null) {
      return unscoreable(
        "Invalid Spread",
        spreadDisagreement,
        parsePick(pick).spread !== 0,
      );
    }
    const key = String(pick);
    const held = scored.get(key);
    if (held != null) return held;
    const score = scoreCell(pick, resultsByTeam);
    scored.set(key, score);
    return score;
  });
}
