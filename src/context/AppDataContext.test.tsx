import { act, render } from "@testing-library/react";
import { Profiler } from "react";
import { MemoryRouter } from "react-router";
import { RakMadnessScores } from "../types/RakMadnessScores";
import { NO_SCORE_CHANGES } from "../utils/scoring/scoreChanges";
import { writeSettledWeek } from "../utils/settledWeeksCache";
import {
  AppDataContextProvider,
  useCalendar,
  useIsWeekSettled,
  useScores,
  useScoringStatus,
} from "./AppDataContext";

const SCORES = { scores: [] } as unknown as RakMadnessScores;
const SETTLED_SCORES = {
  tiebreaker: 40,
  scores: [{ college: [{ status: "yes" }], pro: [{ status: "no" }] }],
} as unknown as RakMadnessScores;
const NO_OP = () => {};

let heldScores: RakMadnessScores | undefined;
let heldAttempt: { season: number; weekNumber: number } | undefined;

let setRefreshing: (value: boolean) => void;

vi.mock("../hooks/usePlayerScores", async () => {
  const { useMemo, useState } = await import("react");
  return {
    default: function usePlayerScores() {
      const [isRefreshing, set] = useState(false);
      setRefreshing = set;
      return useMemo(
        () => ({
          scores: heldScores,
          scoreChanges: NO_SCORE_CHANGES,
          attemptedFor: heldAttempt,
          isScoresLoading: false,
          isRefreshing,
          fetchingLeagues: new Set(),
          scoreLocalFile: NO_OP,
          refresh: NO_OP,
          rescore: NO_OP,
        }),
        [isRefreshing],
      );
    },
  };
});
vi.mock("../hooks/useLeagueWeeks", () => {
  const leagueWeeks = { weeks: [], loadedSeason: 2024 };
  return { default: () => leagueWeeks };
});
vi.mock("../hooks/usePicksSeasons", () => {
  const picksSeasons = { seasons: [2024], picksWeeks: () => [] };
  return { default: () => picksSeasons };
});
vi.mock("../hooks/useCurrentSeason", () => ({ default: () => 2024 }));

const renders = { scores: 0, calendar: 0, status: 0 };

function Counted({
  name,
  hook,
}: {
  name: keyof typeof renders;
  hook: () => unknown;
}) {
  return (
    <Profiler id={name} onRender={() => (renders[name] += 1)}>
      <Reader hook={hook} />
    </Profiler>
  );
}

function Reader({ hook }: { hook: () => unknown }) {
  hook();
  return null;
}

describe("AppDataContextProvider", () => {
  beforeEach(() => {
    heldScores = SCORES;
    heldAttempt = undefined;
    localStorage.clear();
  });

  function isSettledAt(path: string): boolean | undefined {
    let isSettled: boolean | undefined;
    render(
      <MemoryRouter initialEntries={[path]}>
        <AppDataContextProvider>
          <Reader hook={() => (isSettled = useIsWeekSettled())} />
        </AppDataContextProvider>
      </MemoryRouter>,
    );
    return isSettled;
  }

  it.each([true, false])(
    "reads a week not yet scored as recorded, settled=%s",
    (recorded) => {
      heldScores = undefined;
      writeSettledWeek(2024, 5, recorded);

      expect(isSettledAt("/2024/5")).toBe(recorded);
    },
  );

  it("reads a week scored with nothing to show as open, whatever was recorded", () => {
    heldScores = undefined;
    heldAttempt = { season: 2024, weekNumber: 5 };
    writeSettledWeek(2024, 5, true);

    expect(isSettledAt("/2024/5")).toBe(false);
  });

  it("reads the week's own scores once scoring has tried it", () => {
    heldScores = SETTLED_SCORES;
    heldAttempt = { season: 2024, weekNumber: 5 };

    expect(isSettledAt("/2024/5")).toBe(true);
  });

  it("does not read the last week's settled scores as the next week's outcome", () => {
    heldScores = SETTLED_SCORES;
    heldAttempt = { season: 2024, weekNumber: 4 };

    expect(isSettledAt("/2024/5")).toBe(false);
  });

  it("re-renders only the consumers of what changed", () => {
    render(
      <MemoryRouter>
        <AppDataContextProvider>
          <Counted name="scores" hook={useScores} />
          <Counted name="calendar" hook={useCalendar} />
          <Counted name="status" hook={useScoringStatus} />
        </AppDataContextProvider>
      </MemoryRouter>,
    );
    const before = { ...renders };

    act(() => setRefreshing(true));

    expect(renders.status).toBe(before.status + 1);
    expect(renders.scores).toBe(before.scores);
    expect(renders.calendar).toBe(before.calendar);
  });
});
