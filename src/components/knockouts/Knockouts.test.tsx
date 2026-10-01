import { render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { SettingsContextProvider } from "../../context/SettingsContext";
import { POLL_MS } from "../../hooks/useLiveWeek";
import { GameStatus } from "../../types/ESPN";
import { League } from "../../types/League";
import { PlayerScore, RakMadnessScores } from "../../types/RakMadnessScores";
import getSwingGames from "../../utils/scoring/getSwingGames";
import {
  liveGame,
  upcomingGame,
  weekOf,
} from "../../utils/scoring/leagueResultFixtures";
import { LeagueResults } from "../../utils/scoring/leagueResults";
import applyKnockouts from "../../utils/scoring/applyKnockouts";
import comparePlayerScores from "../../utils/scoring/comparePlayerScores";
import { pick, player, week } from "../../utils/scoring/scoringTestFixtures";
import SwingGames from "./SwingGames";

const proLive = {
  ...liveGame({ home: "DEN", away: "KC", homeScore: 7, awayScore: 3 }),
  id: "401",
};
const proUpcoming = { ...upcomingGame({ home: "LAR", away: "SF" }), id: "402" };

/** A point behind Bob, so Alice is out if either of her picks misses. */
function liveScores(): RakMadnessScores {
  const scores = week([
    player({ name: "Alice", total: 5, pro: [pick("KC"), pick("SF")] }),
    player({ name: "Bob", total: 6, pro: [pick("DEN"), pick("LAR")] }),
  ]);
  scores.games = [
    { label: "P1", league: League.PRO, name: "KC at DEN", result: proLive },
    { label: "P2", league: League.PRO, name: "SF at LAR", result: proUpcoming },
  ];
  return scores;
}

/** A finished week, knocked out as the scoring pass would. */
function settled(players: Array<PlayerScore>, tiebreaker: number) {
  return week(
    applyKnockouts([...players].sort(comparePlayerScores), tiebreaker),
    tiebreaker,
  );
}

type Poll = (
  leagues: ReadonlyArray<League>,
) => Promise<LeagueResults | undefined>;

function page(
  scores: RakMadnessScores,
  onPoll?: Poll,
  fetchingLeagues?: ReadonlySet<League>,
) {
  return (
    <MemoryRouter>
      <SettingsContextProvider>
        <SwingGames
          scores={scores}
          swings={getSwingGames(scores)}
          onPoll={onPoll}
          fetchingLeagues={fetchingLeagues}
        />
      </SettingsContextProvider>
    </MemoryRouter>
  );
}

const labelsIn = (section: string) =>
  within(screen.getByRole("region", { name: section }))
    .getAllByRole("heading", { level: 3 })
    .map(
      (band) =>
        band.querySelector(".swing-games__game-label")?.textContent ?? "",
    );

beforeEach(() => localStorage.clear());

describe("SwingGames", () => {
  it("draws the busy bar only while a live game's league is fetched", () => {
    const scores = liveScores();
    const { rerender } = render(
      page(scores, undefined, new Set([League.COLLEGE])),
    );
    expect(screen.queryByRole("progressbar")).toBeNull();

    rerender(page(scores, undefined, new Set([League.PRO])));
    expect(screen.getByRole("progressbar")).toHaveAccessibleName(
      "Fetching the games",
    );
  });

  it("polls every twenty seconds, and moves a game to Completed once it is final", async () => {
    vi.useFakeTimers();
    const onPoll = vi
      .fn<Poll>()
      .mockResolvedValue(weekOf("pro", proLive, proUpcoming));
    render(page(liveScores(), onPoll));
    await vi.advanceTimersByTimeAsync(0);

    expect(onPoll).toHaveBeenLastCalledWith([League.PRO]);
    expect(labelsIn("Live")).toEqual(["P1"]);

    onPoll.mockResolvedValue(
      weekOf("pro", { ...proLive, status: GameStatus.FINAL }, proUpcoming),
    );
    await vi.advanceTimersByTimeAsync(POLL_MS);
    expect(onPoll).toHaveBeenCalledTimes(2);
    await waitFor(() => expect(labelsIn("Completed")).toEqual(["P1"]));
    expect(screen.queryByRole("region", { name: "Live" })).toBeNull();

    vi.useRealTimers();
  });
  it("heads the MNF Points knockouts with the total, and gives each one's guess", () => {
    const scores = settled(
      [
        player({
          name: "Alice",
          total: 5,
          pro: [pick("KC", "yes")],
          tiebreakerPick: 40,
          distance: 1,
        }),
        player({
          name: "Bob",
          total: 5,
          pro: [pick("KC", "yes")],
          tiebreakerPick: 50,
          distance: 9,
        }),
      ],
      41,
    );
    render(page(scores));

    expect(
      screen.getByRole("heading", {
        level: 4,
        name: "1 knocked out on MNF Points 41",
      }),
    ).toBeInTheDocument();
    const bob = screen.getByRole("button", {
      name: "Bob, knocked out on MNF Points 50",
    });
    expect(bob).toHaveTextContent("MNF Points 50");
  });

  it("notes the tiebreaker under a name on a side that missed", () => {
    // Level on total and MNF Points, Bob is a college game behind.
    const scores = settled(
      [
        player({
          name: "Alice",
          total: 1,
          collegeScore: 1,
          college: [pick("UGA", "yes")],
          pro: [pick("KC", "no")],
          tiebreakerPick: 40,
          distance: 1,
        }),
        player({
          name: "Bob",
          total: 1,
          college: [pick("BAMA", "no")],
          pro: [pick("DEN", "yes")],
          tiebreakerPick: 40,
          distance: 1,
        }),
      ],
      41,
    );
    render(page(scores));

    expect(
      screen.getByRole("heading", { level: 4, name: "1 knocked out on BAMA" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: "Bob, knocked out on College Score",
      }),
    ).toHaveTextContent("College Score");
  });
});
