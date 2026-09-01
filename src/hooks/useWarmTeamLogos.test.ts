import { renderHook } from "@testing-library/react";
import { League } from "../types/League";
import { LeagueResult } from "../types/LeagueResult";
import { WeekGame } from "../types/WeekGame";
import { finalGame, upcomingGame } from "../utils/scoring/leagueResultFixtures";
import { warmedImageUrls } from "../utils/warmImage";
import useWarmTeamLogos from "./useWarmTeamLogos";

/** The shared fixtures name a team by its abbreviation and carry no logo. */
function withLogos(built: LeagueResult): LeagueResult {
  const withLogo = (side: LeagueResult["home"]): LeagueResult["home"] => ({
    ...side,
    team: {
      ...side.team,
      logoUrl: `https://espn.com/${side.team.abbreviation}.png`,
    },
  });
  return { ...built, home: withLogo(built.home), away: withLogo(built.away) };
}

const college = withLogos(
  finalGame({ home: "OSU", away: "MICH", homeScore: 20, awayScore: 30 }),
);
const pro = withLogos(upcomingGame({ home: "PHI", away: "DAL" }));

const games: Array<WeekGame> = [
  { label: "C1", league: League.COLLEGE, name: "OSU / MICH", result: college },
  // A column ESPN listed no game for, so there is no logo to ask for either.
  { label: "C2", league: League.COLLEGE, name: "PSU / IOWA" },
  { label: "P1", league: League.PRO, name: "DAL @ PHI", result: pro },
];

describe("useWarmTeamLogos", () => {
  it("asks for every mark the week could draw, before a game is opened", () => {
    renderHook(() => useWarmTeamLogos(games));

    expect(warmedImageUrls()).toEqual([
      "https://espn.com/OSU.png",
      "https://espn.com/MICH.png",
      "https://espn.com/PHI.png",
      "https://espn.com/DAL.png",
    ]);
  });

  it("asks for nothing while the week is still loading", () => {
    // `warmImage` keeps what it has warmed for the life of the module, so this
    // asks whether the list grew rather than what is in it.
    const before = warmedImageUrls();

    renderHook(() => useWarmTeamLogos(undefined));

    expect(warmedImageUrls()).toEqual(before);
  });
});
