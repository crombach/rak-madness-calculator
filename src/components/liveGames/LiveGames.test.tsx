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

const proLiveGame = liveGame({
  home: "BUF",
  away: "KC",
  homeScore: 7,
  awayScore: 3,
});
const proLive: LeagueResult = {
  ...proLiveGame,
  home: { ...proLiveGame.home, record: "4-1" },
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

const cards = () =>
  screen
    .queryAllByRole("listitem")
    .filter((item) => item.classList.contains("live-games__game"));

beforeEach(() => localStorage.clear());

describe("LiveGames", () => {
  it("lists the games being played and the ones stopped part way, in table order", () => {
    mount(scores);
    expect(
      cards().map((card) => within(card).getByRole("heading").textContent),
    ).toEqual(["LiveP1KC @ BUF", "DelayedP3DAL @ PHI"]);
  });

  it("draws the busy bar only while a live game's league is fetched", () => {
    const { rerender } = render(
      <SettingsContextProvider>
        <LiveGames
          scores={scores}
          fetchingLeagues={new Set([League.COLLEGE])}
        />
      </SettingsContextProvider>,
    );
    expect(screen.queryByRole("progressbar")).toBeNull();

    rerender(
      <SettingsContextProvider>
        <LiveGames scores={scores} fetchingLeagues={new Set([League.PRO])} />
      </SettingsContextProvider>,
    );
    expect(screen.getByRole("progressbar")).toHaveAccessibleName(
      "Fetching the games",
    );
  });

  it("shows each as a scoreboard with its records, without the strip under it", () => {
    mount(scores);
    expect(screen.getByText("4-1")).toHaveClass("game-status__record");
    expect(screen.queryByRole("link", { name: "Gamecast" })).toBeNull();
    expect(document.querySelector(".game-status__meta")).toBeNull();
  });

  it("says the reader's own pick in place of the pool's line, and marks the side", () => {
    localStorage.setItem(PLAYER_NAME_KEY, "alice");
    mount(scores);
    const [first] = cards();
    const myPick = within(first).getByText(/Your Pick/);
    expect(myPick).toHaveTextContent("Your Pick: KC -3");
    expect(myPick.parentElement).toHaveClass("live-games__header");
    expect(within(first).getAllByText(/Your Pick/)).toHaveLength(1);
    expect(
      first.querySelector(".game-status__team-name.--picked"),
    ).toHaveTextContent("KC");
  });

  it("says how many players picked each side", () => {
    mount(scores);
    const [first] = cards();
    const [away, home] = first.querySelectorAll(".game-status__split > span");
    expect(away).toHaveTextContent("1 picked KC");
    expect(home).toHaveTextContent("0 picked BUF");
  });

  it("says the pool's line with no name set", () => {
    mount(scores);
    const [first] = cards();
    expect(within(first).getByText(/Spread/)).toHaveTextContent(/^Spread: /);
    expect(within(first).getByText(/Spread/).parentElement).toHaveClass(
      "live-games__header",
    );
    expect(screen.queryByText(/Your Pick/)).toBeNull();
  });

  it("lists the games not started yet under Up next, by kickoff", () => {
    const later = {
      ...upcomingGame({ home: "NE", away: "MIA" }),
      id: "405",
      date: new Date(proUpcoming.date.getTime() + 3_600_000),
    };
    mount({
      ...scores,
      games: [
        ...(scores.games ?? []),
        column("P4", League.PRO, later),
      ].reverse(),
    });
    const next = screen.getByRole("region", { name: "Up next" });
    expect(
      within(next)
        .getAllByRole("listitem")
        .map((item) => item.firstChild?.textContent),
    ).toEqual(["P2", "P4"]);
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
