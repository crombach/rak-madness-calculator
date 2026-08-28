import { useEffect, useMemo, useRef, useState } from "react";
import { errorToast, useToastActions } from "../context/ToastContext";
import { League, WeekInfo } from "../types/League";
import getLeagueInfo from "../utils/getLeagueInfo";
import latestOnly from "../utils/latestOnly";

/**
 * The season's weeks, from the ESPN calendar, plus which one is selected.
 *
 * `selectableWeeks` holds the very objects the calendar returned. The week picker
 * compares its options by reference, so copying or rebuilding a `WeekInfo`
 * anywhere downstream leaves the picker unable to show a selection.
 *
 * `initialWeek` wins over the season's active week when the season has such a
 * week. A results URL names the week it wants, and without this the current week
 * would be selected and scored first, only to be replaced. It is read when the
 * calendar lands, so it can change without costing another lookup.
 *
 * `season` is the year a season started in. Left out, ESPN answers with the
 * season running now, and `seasonYear` comes back saying which one that was. A
 * season that has ended has every week behind it, so all of them are selectable.
 *
 * `enabled` holds the lookup back until the caller knows which season to ask for.
 * Without it the season running now would be fetched first and shown for a moment,
 * which is the wrong season whenever the pool is between seasons.
 */
export default function useLeagueWeeks(
  initialWeek?: number,
  season?: number,
  enabled = true,
) {
  const { showToast } = useToastActions();

  const [weeks, setWeeks] = useState<Array<WeekInfo>>();
  const [currentWeek, setCurrentWeek] = useState<number>();
  const [seasonYear, setSeasonYear] = useState<number>();
  const [selectedWeek, setSelectedWeek] = useState<WeekInfo>();
  const [isLookupPending, setLoading] = useState(true);

  // Read when the calendar lands rather than depended on, so changing week does
  // not fetch the whole season again. The URL is what moves it, and the schedule
  // is the same either way.
  const initialWeekRef = useRef(initialWeek);
  // Declared above the lookup, so a season and week that change together are in
  // step before the lookup they both belong to starts.
  useEffect(() => {
    initialWeekRef.current = initialWeek;
  }, [initialWeek]);

  useEffect(() => {
    if (!enabled) return;
    // A season switched away from while its lookup was still out must not land.
    // It would leave `seasonYear` naming a season nobody asked for, which reads as
    // loading forever, with no further lookup queued to end it.
    return latestOnly(async (isCurrent) => {
      const proLeagueInfo = await getLeagueInfo(League.PRO, season);
      if (!isCurrent()) return;
      if (proLeagueInfo == null) {
        // The season that was asked for, even though nothing came back for it.
        // Everything the season we came from told us goes, or its weeks would
        // answer for a season nobody has the schedule of, and a week of it would
        // be scored against this one.
        setSeasonYear(season);
        setWeeks(undefined);
        setCurrentWeek(undefined);
        setSelectedWeek(undefined);
        setLoading(false);
        showToast(errorToast("Failed to load the pro schedule."));
        return;
      }
      const calendarWeeks = proLeagueInfo.activeCalendar.weeks;
      setWeeks(calendarWeeks);
      setCurrentWeek(proLeagueInfo.activeWeek?.value);
      setSeasonYear(proLeagueInfo.season);
      // The week the URL named, or the one the season has reached. That is the
      // last regular week once the season is over, and none at all until its
      // opener has been played.
      setSelectedWeek(
        calendarWeeks.find((week) => week.value === initialWeekRef.current) ??
          proLeagueInfo.activeWeek,
      );
      setLoading(false);
    });
  }, [showToast, season, enabled]);

  // Derived rather than a flag set when the season changes, so the switch counts
  // as loading from the render that asks for it. `seasonYear` is the season the
  // week list actually describes, so they differ exactly while a new one is on
  // its way.
  const isWeekInfoLoading =
    !enabled || isLookupPending || (season != null && season !== seasonYear);

  // Newest first, and never a week the season has not reached. A season with no
  // week behind it offers none, which is what the 0 stands for: `slice` would read
  // a missing end as the whole array.
  const selectableWeeks = useMemo(
    () => (weeks ?? []).slice(0, currentWeek ?? 0).reverse(),
    [weeks, currentWeek],
  );

  // Memoized so `AppDataContext` can memoize the value it publishes.
  return useMemo(
    () => ({
      weeks,
      selectableWeeks,
      currentWeek,
      seasonYear,
      selectedWeek,
      setSelectedWeek,
      isWeekInfoLoading,
    }),
    [
      weeks,
      selectableWeeks,
      currentWeek,
      seasonYear,
      selectedWeek,
      isWeekInfoLoading,
    ],
  );
}
