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
const NO_OP = () => {};

let heldScores: RakMadnessScores | undefined;
let isLoading = false;

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
          attemptedFor: undefined,
          isScoresLoading: isLoading,
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
    isLoading = false;
    localStorage.clear();
  });

  it.each([
    { recorded: true, loading: true, expected: true },
    { recorded: false, loading: true, expected: false },
    { recorded: true, loading: false, expected: false },
  ])(
    "reads the recorded flag $recorded as settled=$expected with no scores and loading=$loading",
    ({ recorded, loading, expected }) => {
      heldScores = undefined;
      isLoading = loading;
      writeSettledWeek(2024, 5, recorded);
      let isSettled: boolean | undefined;
      render(
        <MemoryRouter initialEntries={["/2024/5"]}>
          <AppDataContextProvider>
            <Reader hook={() => (isSettled = useIsWeekSettled())} />
          </AppDataContextProvider>
        </MemoryRouter>,
      );

      expect(isSettled).toBe(expected);
    },
  );

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
