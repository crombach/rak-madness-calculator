import { render, screen, waitFor, within } from "@testing-library/react";
import {
  PLAYER_NAME_KEY,
  SettingsContextProvider,
} from "../../context/SettingsContext";
import { POLL_MS } from "../../hooks/useLiveWeek";
import { GameStatus } from "../../types/ESPN";
import { League } from "../../types/League";
import { LeagueResult } from "../../types/LeagueResult";
import { RakMadnessScores } from "../../types/RakMadnessScores";
import { WeekGame } from "../../types/WeekGame";
import {
  delayedGame,
  finalGame,
  liveGame,
  upcomingGame,
  weekOf,
} from "../../utils/scoring/leagueResultFixtures";
import { LeagueResults } from "../../utils/scoring/leagueResults";
import { pick, player } from "../../utils/scoring/scoringTestFixtures";
import LiveGames from "./LiveGames";

const proLive: LeagueResult = {
  ...liveGame({ home: "BUF", away: "KC", homeScore: 7, awayScore: 3 }),
  id: "401",
  period: 3,
  clock: "8:42",
};
const proUpcoming = { ...upcomingGame({ home: "LV", away: "DEN" }), id: "402" };
const proDelayed = {
  ...delayedGame({
    home: "PHI",
    away: "DAL",
    homeScore: 10,
    awayScore: 3,
    period: 4,
  }),
  id: "403",
};
const collegeFinal = {
  ...finalGame({ home: "OSU", away: "MICH", homeScore: 20, awayScore: 30 }),
  id: "404",
};

function column(label: string, league: League, result: LeagueResult): WeekGame {
  return { label, league, name: result.shortName, result };
}

const scores: RakMadnessScores = {
  scores: [
    player({
      name: "Alice",
      college: [pick("MICH")],
      pro: [pick("KC -3"), pick("DEN"), pick("PHI")],
    }),
  ],
  games: [
    column("C1", League.COLLEGE, collegeFinal),
    column("P1", League.PRO, proLive),
    column("P2", League.PRO, proUpcoming),
    column("P3", League.PRO, proDelayed),
  ],
};

function mount(
  shown: RakMadnessScores,
  onPoll: (
    leagues: ReadonlyArray<League>,
  ) => Promise<LeagueResults | undefined> = () => Promise.resolve(undefined),
) {
  return render(
    <SettingsContextProvider>
      <LiveGames scores={shown} onPoll={onPoll} />
    </SettingsContextProvider>,
  );
}

const cards = () => screen.queryAllByRole("listitem");

beforeEach(() => localStorage.clear());

describe("LiveGames", () => {
  it("lists the games being played and the ones stopped part way, in table order", () => {
    mount(scores);
    expect(
      cards().map((card) => within(card).getByRole("heading").textContent),
    ).toEqual(["LiveP1KC @ BUF", "DelayedP3DAL @ PHI"]);
  });

  it("shows each as a scoreboard alone, without a record or the strip under it", () => {
    mount(scores);
    expect(screen.queryByRole("link", { name: "Gamecast" })).toBeNull();
    expect(document.querySelector(".game-status__meta")).toBeNull();
  });

  it("says the reader's own pick in place of the pool's line, and marks the side", () => {
    localStorage.setItem(PLAYER_NAME_KEY, "alice");
    mount(scores);
    const [first] = cards();
    expect(within(first).getByText(/Your Pick/)).toHaveTextContent(
      "Your Pick: KC -3",
    );
    expect(
      first.querySelector(".game-status__team-name.--picked"),
    ).toHaveTextContent("KC");
  });

  it("says the pool's line with no name set", () => {
    mount(scores);
    expect(screen.getAllByText(/Rak Madness Spread/)).toHaveLength(2);
    expect(screen.queryByText(/Your Pick/)).toBeNull();
  });

  it("says so when nothing is being played", () => {
    mount({ ...scores, games: [column("C1", League.COLLEGE, collegeFinal)] });
    expect(screen.getByRole("status")).toHaveTextContent(
      "No games are live right now",
    );
    expect(screen.queryByRole("list")).toBeNull();
  });

  it("polls every twenty seconds, and drops a game once it is final", async () => {
    vi.useFakeTimers();
    const onPoll = vi
      .fn<
        (leagues: ReadonlyArray<League>) => Promise<LeagueResults | undefined>
      >()
      .mockResolvedValue(
        weekOf("pro", { ...proLive, clock: "5:00" }, proUpcoming, proDelayed),
      );
    mount(scores, onPoll);
    await vi.advanceTimersByTimeAsync(0);

    // The college week is over, so only the pro one is asked about.
    expect(onPoll).toHaveBeenLastCalledWith([League.PRO]);
    expect(await screen.findByText("Q3 5:00")).toBeInTheDocument();

    onPoll.mockResolvedValue(
      weekOf(
        "pro",
        { ...proLive, status: GameStatus.FINAL },
        proUpcoming,
        proDelayed,
      ),
    );
    await vi.advanceTimersByTimeAsync(POLL_MS);
    expect(onPoll).toHaveBeenCalledTimes(2);
    await waitFor(() => expect(cards()).toHaveLength(1));

    vi.useRealTimers();
  });
});
