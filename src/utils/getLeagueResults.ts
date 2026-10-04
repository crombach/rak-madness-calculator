import {
  EspnCompetitor,
  EspnEvent,
  EspnPlay,
  EspnSituation,
  EspnStatus,
  EspnVenue,
  GameStatus,
  HomeAway,
  REGULATION_PERIODS,
} from "../types/ESPN";
import { League, SeasonType, WeekInfo } from "../types/League";
import { GameSide, LeagueResult, Possession } from "../types/LeagueResult";
import debugLog from "./debugLog";
import {
  CachedGame,
  isSettled,
  matchupKey,
  readCachedResults,
  writeCachedResults,
} from "./espnCache";
import espnScoreboardUrl from "./espnScoreboardUrl";
import { getRegularSeasonWeekCount } from "./getLeagueInfo";
import { findMatchup, indexResults } from "./scoring/resultsIndex";

/**
 * Used only where the season's own calendar could not be read. The NCAA count
 * moves (15 weeks in 2023, 16 in 2024, Army/Navy being its own week), so it is
 * asked for per season rather than trusted from here.
 */
const WEEKS_COLLEGE_REGULAR_SEASON = 16;
const WEEKS_PRO_REGULAR_SEASON = 18;

/**
 * Week 1 of Rak Madness is week 1 in the NFL, but week 2 in the NCAA.
 */
const WEEK_OFFSET_COLLEGE = 1;

// You can find group IDs by looking at weekly scoreboards. Example:
// https://www.espn.com/college-football/scoreboard/_/group/22
const COLLEGE_GROUPS = [
  80, // Division 1
  22, // Ivy League (occasionally appears in Rak Madness)
];

/** A scoreboard URL's events, or thrown where ESPN answered with neither. */
async function fetchEspnEvents(url: string): Promise<Array<EspnEvent>> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`ESPN scoreboard request failed: ${response.status}`);
  }
  const json = await response.json();
  if (!Array.isArray(json.events)) {
    throw new Error("ESPN scoreboard response had no events array");
  }
  return json.events as Array<EspnEvent>;
}

async function getLeagueEvents(
  league: League,
  week: WeekInfo, // Rak Madness week, corresponds with NFL regular season week
  season?: number,
): Promise<Array<EspnEvent>> {
  // This league's calendar and no other. The other league's week count decides
  // nothing below, and asking for it is a round trip to ESPN the answer waits on.
  const isCollege = league === League.COLLEGE;
  const weeksInRegularSeason =
    (await getRegularSeasonWeekCount(league, season)) ??
    (isCollege ? WEEKS_COLLEGE_REGULAR_SEASON : WEEKS_PRO_REGULAR_SEASON);

  // After the regular season is over, ESPN resets the week counter to 1 for the postseason.
  let adjustedWeekNumber = isCollege
    ? week.value + WEEK_OFFSET_COLLEGE
    : week.value > weeksInRegularSeason
      ? week.value % weeksInRegularSeason
      : week.value;
  const seasonType: SeasonType =
    (isCollege && adjustedWeekNumber <= weeksInRegularSeason) ||
    (!isCollege && week.value <= weeksInRegularSeason)
      ? SeasonType.REGULAR
      : SeasonType.POST;
  // For college games, the postseason is all week 1
  // because ESPN considers the entire postseason to be "the bowl week".
  if (league === League.COLLEGE && seasonType === SeasonType.POST) {
    adjustedWeekNumber = 1;
  }

  // Build final request URL. `dates` is the year the season started in, not the
  // calendar year its games fall in, so `dates=2025&week=18` is the January 2026
  // game it should be. Left off, ESPN answers with the season running now.
  const requestParams = {
    week: adjustedWeekNumber,
    seasontype: seasonType,
    dates: season,
  };

  if (league === League.COLLEGE) {
    const collegePromises = COLLEGE_GROUPS.map((groupId: number) => {
      const requestUrl = espnScoreboardUrl(league, {
        ...requestParams,
        limit: 400,
        groups: groupId,
      });
      return fetchEspnEvents(requestUrl).then((events) => {
        // ESPN jams the entire college postseason into one week. Events before
        // the given NFL week are dropped. Events after are kept, because a
        // picks sheet has once named a game outside the NFL week.
        return events.filter(
          (event) => new Date(event.date).valueOf() >= week.startDate.valueOf(),
          // && eventDate.valueOf() <= week.endDate.valueOf()
        );
      });
    });

    // Latest first. The postseason arrives as one bowl week spanning a month, so a
    // team can appear twice, and the later game is the one that week is about.
    // Read once per event rather than twice per comparison, since a college week
    // arrives as hundreds of them.
    return (await Promise.all(collegePromises))
      .flat(1)
      .map((event) => ({ event, at: new Date(event.date).valueOf() }))
      .sort((a, b) => b.at - a.at)
      .map((dated) => dated.event);
  }

  return fetchEspnEvents(espnScoreboardUrl(league, requestParams));
}

/** Finish times already read, by event id. */
const finishes = new Map<string, Date | null>();

/** ESPN's play type for the last play of a finished game. */
const PLAY_TYPE_END_OF_GAME = "66";

/** One play per page, over an event's plays. */
function playPageUrl(league: League, eventId: string, page?: number): string {
  const search = page != null ? `&page=${page}` : "";
  return `https://sports.core.api.espn.com/v2/sports/football/leagues/${league}/events/${eventId}/competitions/${eventId}/plays?limit=1${search}`;
}

/**
 * When a final game ended, read off the wall clock of its last play. The
 * scoreboard gives only the kickoff. Two requests, since the first only counts
 * the plays.
 *
 * Null where ESPN has no plays or no clock for the game. Undefined on a failed
 * request, and while the feed has not yet posted the end of the game, which it
 * can do after the scoreboard calls the game final. Nothing is remembered then,
 * so it is asked again.
 */
async function gameFinish(
  league: League,
  eventId: string,
): Promise<Date | null | undefined> {
  if (finishes.has(eventId)) {
    return finishes.get(eventId);
  }
  try {
    const count = await fetch(playPageUrl(league, eventId));
    if (!count.ok) return undefined;
    const { pageCount } = await count.json();
    const page = await fetch(playPageUrl(league, eventId, pageCount));
    if (!page.ok) return undefined;
    const last = (await page.json()).items?.[0];
    if (last != null && last.type?.id !== PLAY_TYPE_END_OF_GAME) {
      return undefined;
    }
    const finish = new Date(last?.wallclock);
    const known = Number.isNaN(finish.getTime()) ? null : finish;
    finishes.set(eventId, known);
    return known;
  } catch {
    return undefined;
  }
}

/** The season record, which ESPN sends beside the home and road splits. */
const RECORD_TYPE_SEASON = "total";

/** Both sides of an event, or null where ESPN sent one with a side missing. */
function eventSides(
  event: EspnEvent,
): { home: EspnCompetitor; away: EspnCompetitor } | null {
  const { competitors } = event.competitions[0];
  const home = competitors.find(
    (competitor: EspnCompetitor) => competitor.homeAway === "home",
  );
  const away = competitors.find(
    (competitor: EspnCompetitor) => competitor.homeAway === "away",
  );
  return home != null && away != null ? { home, away } : null;
}

/**
 * A side's name as every index and every matchup key spells it.
 *
 * Empty where ESPN lists a side it has no team for, which a bowl slot still to be
 * filled arrives as. The type says the field is always there and the answers do
 * not, which is what the reads below guard against.
 */
function teamAbbreviation(competitor: EspnCompetitor): string {
  return competitor.team.abbreviation?.toUpperCase() ?? "";
}

const QUARTER_SECONDS = 15 * 60;
/** Seconds the clock may run past a play before the play counts as stale. */
const STALE_PLAY_SECONDS = 60;
const TOUCHDOWN_POINTS = 6;

/** Plays that say nothing about who has the ball. */
const BREAK_PLAYS = new Set([
  "Timeout",
  "Official Timeout",
  "Two-minute warning",
  "End Period",
  "End of Half",
  "End of Regulation",
  "End of Game",
  "Coin Toss",
]);

/**
 * The caller, from `Timeout #1 by KC at 02:00.` or, in college, from
 * `Timeout San Diego State, clock 08:47`.
 */
const TIMEOUT_CALLER = /^Timeout (?:#\d by (\w+) at |(.+), clock )/;
/** The pro play-by-play spells these teams apart from the scoreboard. */
const PLAY_BY_PLAY_ABBREVIATIONS: Record<string, string> = {
  ARZ: "ARI",
  BLT: "BAL",
  CLV: "CLE",
  HST: "HOU",
  LA: "LAR",
  WAS: "WSH",
};

/**
 * Whether the clock has run well past the last play, which ESPN's scoreboard can
 * lag behind by minutes. Both count down the seconds left in regulation.
 */
function isStale(play: EspnPlay, { period, displayClock }: EspnStatus) {
  const playedAt = play.probability?.secondsLeft;
  const [minutes, seconds] = (displayClock ?? "").split(":").map(Number);
  if (
    playedAt == null ||
    period == null ||
    period > REGULATION_PERIODS ||
    isNaN(seconds)
  ) {
    return false;
  }
  const now =
    (REGULATION_PERIODS - period) * QUARTER_SECONDS + minutes * 60 + seconds;
  return playedAt - now > STALE_PLAY_SECONDS;
}

/**
 * Who has the ball. ESPN's `possession` wins where it gives one, else the side that
 * held the ball when the last play ended. Also what is happening between plays,
 * like `KC timeout` or `BUF to kick off`.
 */
function readPossession(
  situation: EspnSituation | undefined,
  status: EspnStatus,
  sides: Array<EspnCompetitor>,
): Possession {
  const byId = (id?: string) => sides.find((side) => side.id === id);
  const possession: Possession = {
    downDistanceText: situation?.downDistanceText,
    homeAway: byId(situation?.possession)?.homeAway,
  };
  const play = situation?.lastPlay;
  const type = play?.type?.text;
  if (play == null || type == null || isStale(play, status)) {
    return possession;
  }
  // After a score short of a touchdown, the side that started the play kicks off.
  // That is the kicker after a field goal and the offense after a safety.
  const points = play.scoreValue ?? 0;
  if (points > 0 && points < TOUCHDOWN_POINTS) {
    const kicker = byId(play.start?.team?.id);
    const between = kicker && `${teamAbbreviation(kicker)} to kick off`;
    return { ...possession, between };
  }
  if (BREAK_PLAYS.has(type)) {
    const [, pro, college] = TIMEOUT_CALLER.exec(play.text ?? "") ?? [];
    const name = college ?? PLAY_BY_PLAY_ABBREVIATIONS[pro] ?? pro;
    const caller = sides.find(
      (side) =>
        name != null &&
        (side.team.location === name || teamAbbreviation(side) === name),
    );
    const between = caller && `${teamAbbreviation(caller)} timeout`;
    return { ...possession, between };
  }
  const holder = byId((play.end?.team ?? play.team)?.id);
  return {
    ...possession,
    homeAway: possession.homeAway ?? holder?.homeAway,
  };
}

/**
 * Whether any picks column asks about this event, read off the event rather than the
 * game built from it. A college week arrives as hundreds of events and the picks name
 * a handful, so the rest are dropped before anything is built out of them.
 */
function isWanted(
  event: EspnEvent,
  wantedPairs: Set<string>,
  wantedTeams: Set<string>,
): boolean {
  const sides = eventSides(event);
  if (sides == null) return false;
  const home = teamAbbreviation(sides.home);
  const away = teamAbbreviation(sides.away);
  // A side ESPN named no team for matches no column, and `matchupKey` cannot fold
  // a name it does not have.
  if (home === "" || away === "") return false;
  return (
    wantedPairs.has(matchupKey(new Set([home, away]))) ||
    wantedTeams.has(home) ||
    wantedTeams.has(away)
  );
}

function gameSide(competitor: EspnCompetitor): GameSide {
  return {
    team: {
      name: competitor.team.displayName,
      // The two halves of that name, which the game status sets on their own lines.
      // Kept only where ESPN sent both. Half a name on a line of its own reads
      // as the other half having gone missing.
      location: competitor.team.location,
      mascot: competitor.team.name,
      abbreviation: teamAbbreviation(competitor),
      logoUrl: competitor.team.logo,
    },
    score: Number(competitor.score),
    record: competitor.records?.find(
      (record) => record.type === RECORD_TYPE_SEASON,
    )?.summary,
    // A period ESPN sent without a value reads as no points rather than dropping
    // the period, which would slide every later quarter a column left.
    linescores: competitor.linescores?.map((line) => line.value ?? 0) ?? [],
  };
}

/**
 * Where the game is played, as the town and nothing more.
 *
 * The ground's own name is left out. A reader who wants it has the Gamecast link the
 * dialog carries, and the name is stored in this browser for every game of every week
 * cached otherwise.
 */
function gameVenue(venue?: EspnVenue): string | undefined {
  const place = [venue?.address?.city, venue?.address?.state]
    .filter((it) => it != null)
    .join(", ");
  return place !== "" ? place : undefined;
}

/**
 * ESPN's status for a game, as the four the app models.
 *
 * `state` is what says a game is underway, not `id`: halftime and the end of a
 * quarter carry ids of their own, and off the id alone a game at the half is
 * neither live nor final. A delayed game is the one state that state gets wrong.
 * ESPN calls it `in` as well, though nobody is playing, so it is read off the id
 * before the state is asked.
 *
 * Everything else keeps its id, so a postponed or canceled game still falls
 * through all four rather than passing for one of them. Suspended (`8`) and rain
 * delay (`17`) are stoppages too, and are knowingly left out: a game carrying one
 * reads as live and says ESPN's own word for it under a quarter that has stopped.
 */
function gameStatus({ type }: EspnStatus): GameStatus {
  if (type.id === GameStatus.DELAYED) {
    return GameStatus.DELAYED;
  }
  return type.state === "in" ? GameStatus.LIVE : type.id;
}

/**
 * One ESPN event as the app describes a game.
 *
 * Null where ESPN sent an event with a side missing, which it never has. Skipping
 * it beats trusting half a game.
 */
export function toLeagueResult(event: EspnEvent): LeagueResult | null {
  const status = gameStatus(event.status);
  const competition = event.competitions[0];
  const sides = eventSides(event);
  if (sides == null) {
    return null;
  }
  const { home, away } = sides;

  const homeSide = gameSide(home);
  const awaySide = gameSide(away);
  const { score: homeScore } = homeSide;
  const { score: awayScore } = awaySide;

  let winner: EspnCompetitor | null = null;
  let winnerHomeAway: HomeAway | null = null;
  if (status === GameStatus.FINAL) {
    if (homeScore > awayScore) {
      winner = home;
      winnerHomeAway = HomeAway.HOME;
    } else if (awayScore > homeScore) {
      winner = away;
      winnerHomeAway = HomeAway.AWAY;
    }
  }

  // Unsigned, so a live game the home team leads never reads as a negative
  // margin just because there is no winner yet.
  const scoreMargin = Math.abs(homeScore - awayScore);

  const possession = readPossession(competition.situation, event.status, [
    home,
    away,
  ]);

  return {
    id: event.id,
    name: event.name,
    shortName: event.shortName,
    date: new Date(event.date),
    status,
    detailMessage: event.status.type.shortDetail,
    period: event.status.period,
    clock: event.status.displayClock,
    home: homeSide,
    away: awaySide,
    isNeutralSite: competition.neutralSite ?? false,
    venue: gameVenue(competition.venue),
    possession,
    winner: {
      team: winner && {
        name: winner.team.displayName,
        abbreviation: teamAbbreviation(winner),
      },
      homeAway: winnerHomeAway,
      by: scoreMargin,
    },
    totalScore: homeScore + awayScore,
  };
}

/**
 * A league's games in date order, college latest first and pro earliest first.
 *
 * College runs backwards because its postseason arrives as one bowl week spanning a
 * month and a team can appear twice, the later game being the one the week is about.
 * Whichever game of the two comes first is the one every lookup by team answers with.
 *
 * Sorted here rather than left in the order ESPN sent, because a game this browser
 * remembered and the ones just fetched are answered with together.
 */
function inDateOrder(
  league: League,
  results: Array<LeagueResult>,
): Array<LeagueResult> {
  const earliestFirst = league !== League.COLLEGE;
  return [...results].sort((a, b) => {
    const gap = a.date.valueOf() - b.date.valueOf();
    return earliestFirst ? gap : -gap;
  });
}

/**
 * Get the results for a given league in a given week, in `inDateOrder`.
 *
 * Nothing is fetched where this browser already has an answer for every matchup that
 * ESPN cannot answer differently later: a game that has been played, or a matchup it
 * listed no game for. That covers a whole week once its last game is over, which is
 * every week but the one being played, and the calendar reads behind the fetch go with
 * it. Changing the picks changes which matchups are asked about, and a matchup that
 * moved has nothing stored under its new name, so the week is fetched again.
 *
 * @param week week in the season (week 1 is the first NFL week)
 * @param matchups the games the picks describe
 * @param season the year the season started in, current season if left out
 */
export async function getLeagueResults(
  league: League,
  week: WeekInfo,
  matchups: Array<Set<string>>,
  season?: number,
): Promise<Array<LeagueResult>> {
  const keys = matchups.map(matchupKey);
  // "Whichever season is running" is not something an answer can be filed under, so a
  // week with no season named is always fetched.
  const held =
    season != null ? readCachedResults(season, week.value, league) : {};
  if (keys.every((key) => key in held)) {
    const settled = [...new Set(keys)]
      .map((key) => held[key])
      .filter((game) => game != null);
    debugLog(`${league} games, every one of them already held`, settled);
    return inDateOrder(league, settled);
  }

  const events = await getLeagueEvents(league, week, season);
  debugLog(`${league} events`, events);

  // The keys the picks ask about, split by how a column names its game.
  // A college answer runs hundreds of events, looked up not walked per game.
  const wantedPairs = new Set<string>();
  const wantedTeams = new Set<string>();
  matchups.forEach((teams, index) => {
    if (teams.size === 2) wantedPairs.add(keys[index]);
    if (teams.size === 1) wantedTeams.add(keys[index]);
  });

  const results = events
    .filter((event) => isWanted(event, wantedPairs, wantedTeams))
    .map(toLeagueResult)
    .filter((it) => it != null);

  // Each matchup and the one game the fetch found for it. Indexed over results
  // already in fetch order, so it picks the same game every lookup by team will.
  const index = indexResults(results);
  const found = new Map<string, CachedGame>();
  matchups.forEach((teams, position) => {
    if (found.has(keys[position])) return;
    found.set(keys[position], findMatchup(index, teams) ?? null);
  });

  await Promise.all(
    [...found].map(async ([key, result]) => {
      if (result?.status === GameStatus.FINAL) {
        const heldFinish = held[key]?.finishedAt;
        result.finishedAt =
          heldFinish !== undefined
            ? heldFinish
            : await gameFinish(league, result.id);
      }
    }),
  );

  const games: Record<string, CachedGame> = {};
  const kept: Array<LeagueResult> = [];
  found.forEach((result, key) => {
    // A game the fetch no longer lists keeps the outcome already held, since
    // ESPN moves a game out of a week, or scored would go missing.
    const game = result ?? held[key] ?? null;
    if (result == null && game != null) {
      kept.push(game);
    }
    if (isSettled(game)) {
      games[key] = game;
    }
  });
  // An answer with no games in it is ESPN not having published the week yet, and
  // holding every matchup of it as a hole would leave the week empty for good.
  if (season != null && events.length > 0) {
    writeCachedResults(season, week.value, league, games);
  }

  return inDateOrder(league, [...results, ...kept]);
}
