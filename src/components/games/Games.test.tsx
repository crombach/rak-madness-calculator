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
import Games from "./Games";

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
      <Games scores={shown} onPoll={onPoll} />
    </SettingsContextProvider>,
  );
}

/** The cards under one section's heading, the Live one unless named. */
const cards = (section = "Live") =>
  within(screen.getByRole("region", { name: section }))
    .queryAllByRole("listitem")
    .filter((item) => item.classList.contains("games__game"));

const labelsIn = (section: string) =>
  cards(section).map(
    (card) => card.querySelector(".games__label")?.textContent,
  );

beforeEach(() => localStorage.clear());

describe("Games", () => {
  it("lists the games being played and the ones stopped part way, in table order", () => {
    mount(scores);
    expect(
      cards().map((card) => within(card).getByRole("heading").textContent),
    ).toEqual(["P1KC @ BUF", "P3DAL @ PHI"]);
  });

  it("marks each card as the dialog's search marks its game", () => {
    mount(scores);
    expect(
      cards().map(
        (card) =>
          within(card).getByRole("img", { name: /Live|Delayed/ }).textContent,
      ),
    ).toEqual(["LIVE", "DLAY"]);
  });

  it("draws the busy bar only while a live game's league is fetched", () => {
    const { rerender } = render(
      <SettingsContextProvider>
        <Games scores={scores} fetchingLeagues={new Set([League.COLLEGE])} />
      </SettingsContextProvider>,
    );
    expect(screen.queryByRole("progressbar")).toBeNull();

    rerender(
      <SettingsContextProvider>
        <Games scores={scores} fetchingLeagues={new Set([League.PRO])} />
      </SettingsContextProvider>,
    );
    expect(screen.getByRole("progressbar")).toHaveAccessibleName(
      "Fetching the games",
    );
  });

  it("shows each as a scoreboard with its records and the dialog's strip under it", () => {
    mount(scores);
    expect(screen.getByText("4-1")).toHaveClass("game-status__record");
    for (const card of cards()) {
      expect(
        within(card).getByRole("link", { name: "Gamecast" }),
      ).toBeInTheDocument();
    }
  });

  it("says the reader's own pick, and marks the side it names", () => {
    localStorage.setItem(PLAYER_NAME_KEY, "alice");
    mount(scores);
    const [first] = cards();
    expect(within(first).getByText(/^Your Pick:/)).toHaveTextContent(
      "Your Pick: KC -3",
    );
    expect(
      first.querySelector(".game-status__team-name.--picked"),
    ).toHaveTextContent("KC");
  });

  it("says how many players picked each side", () => {
    mount(scores);
    const [first] = cards();
    const [away, home] = first.querySelectorAll(".game-status__picks-side");
    expect(away).toHaveTextContent(/^1 picked KC/);
    expect(home).toHaveTextContent(/^0 picked BUF/);
  });

  it("says no pick and marks no side with no name set", () => {
    mount(scores);
    const [first] = cards();
    expect(within(first).getByText(/^All Picks:/)).toBeInTheDocument();
    expect(within(first).queryByText(/^Your Pick:/)).toBeNull();
    expect(first.querySelector(".--picked")).toBeNull();
  });

  it("sorts the games not started yet into today, tomorrow and upcoming, each as a card by kickoff", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2024, 9, 6, 9, 0));
    const at = (id: string, home: string, away: string, date: Date) => ({
      ...upcomingGame({ home, away }),
      id,
      date,
    });
    mount({
      ...scores,
      games: [
        ...(scores.games ?? []).filter(({ label }) => label !== "P2"),
        column(
          "P2",
          League.PRO,
          at("402", "LV", "DEN", new Date(2024, 9, 6, 16)),
        ),
        column(
          "P4",
          League.PRO,
          at("405", "NE", "MIA", new Date(2024, 9, 6, 13)),
        ),
        column(
          "P5",
          League.PRO,
          at("406", "SF", "LAR", new Date(2024, 9, 7, 17)),
        ),
        column(
          "P6",
          League.PRO,
          at("407", "GB", "NYJ", new Date(2024, 9, 10, 17)),
        ),
      ].reverse(),
    });

    expect(
      screen
        .getAllByRole("heading", { level: 2 })
        .map((heading) => heading.textContent),
    ).toEqual(["Live", "Today", "Tomorrow", "Upcoming", "Completed"]);
    expect(labelsIn("Live")).toEqual(["P3", "P1"]);
    expect(labelsIn("Today")).toEqual(["P4", "P2"]);
    expect(labelsIn("Tomorrow")).toEqual(["P5"]);
    expect(labelsIn("Upcoming")).toEqual(["P6"]);
    const [later] = cards("Upcoming");
    expect(later.querySelector(".game-status__meta")).toHaveTextContent(
      "Oct 10, 2024",
    );
    expect(document.querySelector(".games__kickoff")).toBeNull();
    vi.useRealTimers();
  });

  it("leaves out a day with no game to start", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(proUpcoming.date);
    mount(scores);
    expect(labelsIn("Today")).toEqual(["P2"]);
    expect(screen.queryByRole("region", { name: "Tomorrow" })).toBeNull();
    expect(screen.queryByRole("region", { name: "Upcoming" })).toBeNull();
    vi.useRealTimers();
  });

  it("lists the finished games last, in table order", () => {
    const final = (id: string, home: string, away: string, date: Date) => ({
      ...finalGame({ home, away, homeScore: 21, awayScore: 14 }),
      id,
      date,
    });
    mount({
      ...scores,
      games: [
        ...(scores.games ?? []),
        column(
          "P4",
          League.PRO,
          final("405", "NE", "MIA", new Date(2024, 9, 7, 17)),
        ),
        column(
          "P5",
          League.PRO,
          final("406", "SF", "LAR", new Date(2024, 9, 6, 13)),
        ),
      ],
    });

    expect(
      screen.getAllByRole("heading", { level: 2 }).at(-1),
    ).toHaveTextContent("Completed");
    expect(labelsIn("Completed")).toEqual(["C1", "P4", "P5"]);
  });

  it("leaves out Completed while no game is final", () => {
    mount({
      ...scores,
      games: (scores.games ?? []).filter(({ label }) => label !== "C1"),
    });
    expect(screen.queryByRole("region", { name: "Completed" })).toBeNull();
  });

  it("leaves out Live while nothing is being played", () => {
    mount({ ...scores, games: [column("C1", League.COLLEGE, collegeFinal)] });
    expect(
      screen
        .getAllByRole("heading", { level: 2 })
        .map((heading) => heading.textContent),
    ).toEqual(["Completed"]);
    expect(labelsIn("Completed")).toEqual(["C1"]);
  });

  it("says so when the week has no game to list", () => {
    mount({ ...scores, games: [] });
    expect(screen.getByRole("status")).toHaveTextContent("No games this week");
    expect(screen.queryByRole("region")).toBeNull();
  });

  it("asks on every tick for a league with nothing kicked off, as a refresh would", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(proUpcoming.date.getTime() - 3_600_000));
    const onPoll = vi
      .fn<
        (leagues: ReadonlyArray<League>) => Promise<LeagueResults | undefined>
      >()
      .mockResolvedValue(weekOf("pro", proUpcoming));
    mount(
      { ...scores, games: [column("P2", League.PRO, proUpcoming)] },
      onPoll,
    );
    await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(POLL_MS * 2);

    expect(onPoll).toHaveBeenCalledTimes(3);
    expect(onPoll).toHaveBeenLastCalledWith([League.PRO]);
    vi.useRealTimers();
  });

  it("polls every twenty seconds, and moves a game to Completed once it is final", async () => {
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
    expect(labelsIn("Completed")).toEqual(["C1", "P1"]);

    vi.useRealTimers();
  });
});
