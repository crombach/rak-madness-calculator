import { useEffect, useMemo, useRef, useState } from "react";
import { errorToast, useToastActions } from "../context/ToastContext";
import { League, WeekInfo } from "../types/League";
import getLeagueInfo from "../utils/getLeagueInfo";
import latestOnly from "../utils/latestOnly";

type LeagueWeeksOptions = {
  /** The week a results URL names. */
  initialWeekNumber?: number;
  season?: number;
  enabled?: boolean;
  /** The newest week the season has picks for. */
  latestPicksWeek?: number;
};

/**
 * The season's weeks, from the ESPN calendar, plus which one is selected.
 *
 * `selectableWeeks` holds the very objects the calendar returned. The week picker
 * compares its options by reference, so copying or rebuilding a `WeekInfo`
 * anywhere downstream leaves the picker unable to show a selection.
 *
 * Three things can name the selected week, and the first of them the season has
 * wins: `initialWeekNumber`, then `latestPicksWeek`, then the season's active week.
 * A results URL names the week it wants, and without it winning the default would
 * be selected and scored first, only to be replaced. The picks week comes next
 * because ESPN reaches a week days before anyone uploads its sheet, and opening on
 * a week with no picks shows nothing. Both are read when the calendar lands, so
 * either can change without costing another lookup.
 *
 * A week past the active one is ignored, because `selectableWeeks` stops there and
 * the picker would have no option to show as selected.
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
  latestPicksWeek,
}: LeagueWeeksOptions) {
  const { showToast } = useToastActions();

  const [weeks, setWeeks] = useState<Array<WeekInfo>>();
  const [currentWeekNumber, setCurrentWeekNumber] = useState<number>();
  const [defaultWeekNumber, setDefaultWeekNumber] = useState<number>();
  const [loadedSeason, setLoadedSeason] = useState<number>();
  const [selectedWeek, setSelectedWeek] = useState<WeekInfo>();
  const [isCalendarLoading, setLoading] = useState(true);

  // Read when the calendar lands, not depended on, so a week change skips
  // refetching, since the URL moves it and the schedule stays the same either way.
  const initialWeekNumberRef = useRef(initialWeekNumber);
  const latestPicksWeekRef = useRef(latestPicksWeek);
  // Declared above the lookup, so a season and week that change together are in
  // step before the lookup they both belong to starts.
  useEffect(() => {
    initialWeekNumberRef.current = initialWeekNumber;
    latestPicksWeekRef.current = latestPicksWeek;
  }, [initialWeekNumber, latestPicksWeek]);

  useEffect(() => {
    if (!enabled) return;
    // A season switched away from mid-lookup must not land. `loadedSeason` would
    // name one nobody asked for and loop forever, with no lookup queued to end it.
    return latestOnly(async (isCurrent) => {
      const proLeagueInfo = await getLeagueInfo(League.PRO, season);
      if (!isCurrent()) return;
      if (proLeagueInfo == null) {
        // The season that was asked for, even though nothing came back for it.
        // Everything the season we came from told us goes, or its weeks would
        // answer for a season nobody has the schedule of, and a week of it would
        // be scored against this one.
        setLoadedSeason(season);
        setWeeks(undefined);
        setCurrentWeekNumber(undefined);
        setDefaultWeekNumber(undefined);
        setSelectedWeek(undefined);
        setLoading(false);
        showToast(errorToast("Failed to load the pro schedule."));
        return;
      }
      const calendarWeeks = proLeagueInfo.activeCalendar.weeks;
      const { activeWeek } = proLeagueInfo;
      const findWeek = (value?: number) =>
        calendarWeeks.find((week) => week.value === value);

      const picksWeek = findWeek(latestPicksWeekRef.current);
      const defaultWeek =
        activeWeek != null &&
        picksWeek != null &&
        picksWeek.value <= activeWeek.value
          ? picksWeek
          : activeWeek;

      setWeeks(calendarWeeks);
      setCurrentWeekNumber(activeWeek?.value);
      setDefaultWeekNumber(defaultWeek?.value);
      setLoadedSeason(proLeagueInfo.season);
      setSelectedWeek(findWeek(initialWeekNumberRef.current) ?? defaultWeek);
      setLoading(false);
    });
  }, [showToast, season, enabled]);

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
