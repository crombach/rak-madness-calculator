import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { errorToast, useToastActions } from "../context/ToastContext";
import { League, WeekInfo } from "../types/League";
import getLeagueInfo from "../utils/getLeagueInfo";
import useLatestAsync from "./useLatestAsync";

type LeagueWeeksOptions = {
  /** The week a results URL names. */
  initialWeekNumber?: number;
  season?: number;
  enabled?: boolean;
  /** The weeks the season has picks for, newest first. */
  picksWeeks?: Array<number>;
};

/** What one calendar lookup found, and the week it opens on. */
type Calendar = {
  weeks: Array<WeekInfo>;
  currentWeekNumber?: number;
  defaultWeekNumber?: number;
  loadedSeason: number;
  openingWeek?: WeekInfo;
};

/**
 * The season's weeks, from the ESPN calendar, plus which one is selected.
 *
 * `selectableWeeks` holds the very objects the calendar returned. The week picker
 * compares its options by reference, so copying or rebuilding a `WeekInfo`
 * anywhere downstream leaves the picker unable to show a selection.
 *
 * Three things can name the selected week, and the first of them the season has
 * wins: `initialWeekNumber`, then `picksWeeks`, then the season's active week.
 * A results URL names the week it wants, and without it winning the default would
 * be selected and scored first, only to be replaced. A week with picks comes next
 * because ESPN reaches a week days before anyone uploads its sheet, and opening on
 * a week with no picks shows nothing. Both are read when the calendar lands, so
 * either can change without costing another lookup.
 *
 * `picksWeeks` is walked rather than read at its head, and a week the calendar
 * does not carry or one past the active week is passed over. The bucket takes a
 * week number this calendar has no entry for, a playoff week among them, and
 * stopping at the head would drop the whole season's picks over one such upload.
 *
 * `season` left out, ESPN answers with the season running now, and `loadedSeason`
 * comes back saying which one that was. A season that has ended has every week
 * behind it, so all of them are selectable.
 *
 * `enabled` holds the lookup back until the caller knows which season to ask for.
 * Without it the season running now would be fetched first and shown for a moment,
 * which is the wrong season whenever the pool is between seasons.
 */
export default function useLeagueWeeks({
  initialWeekNumber,
  season,
  enabled = true,
  picksWeeks,
}: LeagueWeeksOptions) {
  const { showToast } = useToastActions();

  // Read when the calendar lands, not depended on, so a week change skips
  // refetching, since the URL moves it and the schedule stays the same either way.
  const initialWeekNumberRef = useRef(initialWeekNumber);
  const picksWeeksRef = useRef(picksWeeks);
  // Declared above the lookup, so a season and week that change together are in
  // step before the lookup they both belong to starts.
  useEffect(() => {
    initialWeekNumberRef.current = initialWeekNumber;
    picksWeeksRef.current = picksWeeks;
  }, [initialWeekNumber, picksWeeks]);

  const loadCalendar = useCallback(async (): Promise<Calendar> => {
    const proLeagueInfo = await getLeagueInfo(League.PRO, season);
    if (proLeagueInfo == null) {
      throw new Error(`No pro schedule for season ${season ?? "running now"}`);
    }
    const calendarWeeks = proLeagueInfo.activeCalendar.weeks;
    const { activeWeek } = proLeagueInfo;
    const findWeek = (value?: number) =>
      calendarWeeks.find((week) => week.value === value);

    const picksWeek =
      activeWeek == null
        ? undefined
        : (picksWeeksRef.current ?? [])
            .map((value) => findWeek(value))
            .find((week) => week != null && week.value <= activeWeek.value);
    const defaultWeek = picksWeek ?? activeWeek;
    return {
      weeks: calendarWeeks,
      currentWeekNumber: activeWeek?.value,
      defaultWeekNumber: defaultWeek?.value,
      loadedSeason: proLeagueInfo.season,
      openingWeek: findWeek(initialWeekNumberRef.current) ?? defaultWeek,
    };
  }, [season]);

  // A failed schedule is said aloud, since every week page waits on it.
  const { data: calendar, status } = useLatestAsync(
    enabled ? loadCalendar : undefined,
    () => showToast(errorToast("Failed to load the pro schedule.")),
  );
  const weeks = calendar?.weeks;
  const currentWeekNumber = calendar?.currentWeekNumber;
  const defaultWeekNumber = calendar?.defaultWeekNumber;
  // The season that was asked for where the lookup failed. Everything the season
  // we came from told us goes, or its weeks would answer for a season nobody has
  // the schedule of, and a week of it would be scored against this one.
  const loadedSeason = status === "error" ? season : calendar?.loadedSeason;
  const isCalendarLoading = status !== "success" && status !== "error";

  // The reader's choice until the next calendar lands, which opens on its own week.
  const [selectedWeek, setSelectedWeek] = useState<WeekInfo>();
  const [landedCalendar, setLandedCalendar] = useState(calendar);
  if (calendar !== landedCalendar) {
    setLandedCalendar(calendar);
    setSelectedWeek(calendar?.openingWeek);
  }

  // Derived rather than a flag set when the season changes, so the switch counts
  // as loading from the render that asks for it. `loadedSeason` is the season the
  // week list actually describes, so they differ exactly while a new one is on
  // its way.
  const isWeeksLoading =
    !enabled ||
    isCalendarLoading ||
    (season != null && season !== loadedSeason);

  // Newest first, and never a week the season has not reached. A season with no
  // week behind it offers none, which is what the 0 stands for. `slice` would
  // read a missing end as the whole array.
  const selectableWeeks = useMemo(
    () => (weeks ?? []).slice(0, currentWeekNumber ?? 0).reverse(),
    [weeks, currentWeekNumber],
  );

  // Memoized so `AppDataContext` can memoize the value it publishes.
  return useMemo(
    () => ({
      weeks,
      selectableWeeks,
      currentWeekNumber,
      defaultWeekNumber,
      loadedSeason,
      selectedWeek,
      setSelectedWeek,
      isWeeksLoading,
    }),
    [
      weeks,
      selectableWeeks,
      currentWeekNumber,
      defaultWeekNumber,
      loadedSeason,
      selectedWeek,
      isWeeksLoading,
    ],
  );
}
