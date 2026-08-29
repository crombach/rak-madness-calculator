import { renderHook } from "@testing-library/react";
import { Mock } from "vitest";
import { useAppData } from "../context/AppDataContext";
import { useToastActions } from "../context/ToastContext";
import { SEASON, week } from "../weekFixtures";
import useWeekRouteGuard from "./useWeekRouteGuard";

const navigate = vi.fn();

vi.mock("react-router", () => ({ useNavigate: () => navigate }));
vi.mock("../context/AppDataContext", () => ({ useAppData: vi.fn() }));
vi.mock("../context/ToastContext", async (importOriginal) => ({
  // The real `Toast`, so the assertions below read the header and message the
  // user would see rather than a stand-in's.
  ...(await importOriginal<typeof import("../context/ToastContext")>()),
  useToastActions: vi.fn(),
}));

const CURRENT_WEEK = 5;

const WEEKS = [week(1), week(2), week(3), week(4), week(5), week(6)];

const showToast = vi.fn();
const setSelectedWeek = vi.fn();

/**
 * The app data a results URL is judged against, defaulting to the case that has
 * everything: the schedule loaded, the week scored, and scores to show. Each test
 * takes away only the one thing it is about.
 */
function appData(overrides: Record<string, unknown> = {}) {
  return {
    weeks: WEEKS,
    currentWeekNumber: CURRENT_WEEK,
    loadedSeason: SEASON,
    isWeeksLoading: false,
    findWeek: (value: number) => WEEKS.find((it) => it.value === value),
    // The calendar's own object, not a rebuilt one. The guard compares the URL's
    // week to this by reference, exactly as the real `findWeek` promises.
    selectedWeek: WEEKS[CURRENT_WEEK - 1],
    setSelectedWeek,
    scores: { scores: [{ name: "Alice" }] },
    attemptedFor: { season: SEASON, weekNumber: CURRENT_WEEK },
    ...overrides,
  };
}

function guard(
  seasonParam?: string,
  weekParam?: string,
  overrides: Record<string, unknown> = {},
) {
  (useAppData as Mock).mockReturnValue(appData(overrides));
  return renderHook(() => useWeekRouteGuard(seasonParam, weekParam)).result
    .current;
}

/** The header of the toast the guard raised, or undefined if it raised none. */
function toastHeader(): string | undefined {
  return showToast.mock.calls[0]?.[0]?.header;
}

beforeEach(() => {
  (useToastActions as Mock).mockReturnValue({ showToast });
});

describe("useWeekRouteGuard", () => {
  it("is ready for a week of the loaded season that has scores", () => {
    const result = guard(String(SEASON), String(CURRENT_WEEK));

    expect(result).toEqual({
      status: "ready",
      week: expect.objectContaining({ value: CURRENT_WEEK }),
    });
    expect(navigate).not.toHaveBeenCalled();
    // Setting the same week again would restart the fetch chain behind it.
    expect(setSelectedWeek).not.toHaveBeenCalled();
  });

  it("selects the week the URL names when the season has it", () => {
    guard(String(SEASON), "3");

    expect(setSelectedWeek).toHaveBeenCalledWith(
      expect.objectContaining({ value: 3 }),
    );
  });

  it("sends a season that is not a year home", () => {
    const result = guard("nonsense", String(CURRENT_WEEK));

    expect(result.status).toBe("loading");
    expect(navigate).toHaveBeenCalledWith("/", { replace: true });
    expect(toastHeader()).toBe("Unknown Season");
  });

  it("waits, without judging, while the schedule is still loading", () => {
    // The whole point of the guard: a results URL is opened before the schedule
    // and the picks are known, so nothing may be decided on what is missing yet.
    const result = guard(String(SEASON), String(CURRENT_WEEK), {
      isWeeksLoading: true,
      weeks: undefined,
      loadedSeason: undefined,
      scores: undefined,
      attemptedFor: undefined,
    });

    expect(result).toEqual({ status: "loading" });
    expect(navigate).not.toHaveBeenCalled();
    expect(showToast).not.toHaveBeenCalled();
  });

  it("goes home without a word when the schedule could not be loaded", () => {
    // The lookup already said so in its own toast, so a second one would repeat it.
    const result = guard(String(SEASON), String(CURRENT_WEEK), {
      weeks: undefined,
    });

    expect(result.status).toBe("loading");
    expect(navigate).toHaveBeenCalledWith("/", { replace: true });
    expect(showToast).not.toHaveBeenCalled();
  });

  it("waits while the schedule on hand is still the season before", () => {
    const result = guard(String(SEASON), String(CURRENT_WEEK), {
      loadedSeason: SEASON - 1,
    });

    expect(result).toEqual({ status: "loading" });
    expect(navigate).not.toHaveBeenCalled();
  });

  it("sends a week beyond the one the season has reached home", () => {
    const result = guard(String(SEASON), "6");

    expect(result.status).toBe("loading");
    expect(navigate).toHaveBeenCalledWith("/", { replace: true });
    expect(toastHeader()).toBe("Unknown Week");
  });

  it("sends a week that is not a number home", () => {
    const result = guard(String(SEASON), "nonsense");

    expect(result.status).toBe("loading");
    expect(toastHeader()).toBe("Unknown Week");
  });

  it("sends a week of a season with no week behind it home", () => {
    const result = guard(String(SEASON), String(CURRENT_WEEK), {
      currentWeekNumber: undefined,
    });

    expect(result.status).toBe("loading");
    expect(toastHeader()).toBe("Unknown Week");
  });

  it("waits while the scores on hand answer for another week", () => {
    // Last week's scores are still there until this week's land, and judging them
    // would send the user home from a week that is about to have results.
    const result = guard(String(SEASON), "3", {
      attemptedFor: { season: SEASON, weekNumber: CURRENT_WEEK },
    });

    expect(result).toEqual({
      status: "loading",
      week: expect.objectContaining({ value: 3 }),
    });
    expect(navigate).not.toHaveBeenCalled();
  });

  it("waits while the scores on hand answer for the same week of another season", () => {
    const result = guard(String(SEASON), String(CURRENT_WEEK), {
      attemptedFor: { season: SEASON - 1, weekNumber: CURRENT_WEEK },
    });

    expect(result.status).toBe("loading");
    expect(navigate).not.toHaveBeenCalled();
  });

  it("sends a week that was tried and came back empty home", () => {
    const result = guard(String(SEASON), String(CURRENT_WEEK), {
      scores: { scores: [] },
    });

    expect(result.status).toBe("loading");
    expect(navigate).toHaveBeenCalledWith("/", { replace: true });
    expect(toastHeader()).toBe("No Results");
  });
});
