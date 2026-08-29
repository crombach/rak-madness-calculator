import { useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import { useAppData } from "../context/AppDataContext";
import { Toast, useToastActions } from "../context/ToastContext";
import { WeekInfo } from "../types/League";

type GuardResult =
  { status: "loading"; week?: WeekInfo } | { status: "ready"; week: WeekInfo };

type Redirect = { header: string; message: string } | "silent";

const SEASON_PATTERN = /^\d{4}$/;

/**
 * Decides whether a `/:season/:week` URL has results to show, and sends the user
 * home when it does not.
 *
 * The waiting rules matter more than the redirect ones. A results URL is opened
 * before the schedule has loaded and before the picks have been looked for, so
 * anything that redirects on missing scores has to be sure the season and week it
 * is judging are the ones actually tried. That is what `attemptedFor` is for, and
 * `loadedSeason` is the same guarantee for the schedule.
 */
export default function useWeekRouteGuard(
  seasonParam?: string,
  weekParam?: string,
): GuardResult {
  const navigate = useNavigate();
  const { showToast } = useToastActions();
  const {
    weeks,
    currentWeekNumber,
    loadedSeason,
    isWeeksLoading,
    findWeek,
    selectedWeek,
    setSelectedWeek,
    scores,
    attemptedFor,
  } = useAppData();

  const seasonNumber = Number(seasonParam);
  const isKnownSeason = SEASON_PATTERN.test(seasonParam ?? "");
  const weekNumber = Number(weekParam);
  const week = Number.isInteger(weekNumber) ? findWeek(weekNumber) : undefined;
  const isSelectableWeek =
    week != null &&
    currentWeekNumber != null &&
    weekNumber <= currentWeekNumber;

  // The URL is the source of truth. Comparing before writing matters: setting
  // the same week again would restart the fetch chain behind it. The season is
  // the provider's to follow, which it does while rendering, so it is already
  // right by the time this runs.
  useEffect(() => {
    if (isSelectableWeek && week !== selectedWeek) {
      setSelectedWeek(week);
    }
  }, [isSelectableWeek, week, selectedWeek, setSelectedWeek]);

  let result: GuardResult;
  let redirect: Redirect | undefined;
  if (!isKnownSeason) {
    result = { status: "loading" };
    redirect = {
      header: "Unknown Season",
      message: `${seasonParam} isn't a season, so there is nothing to show.`,
    };
  } else if (isWeeksLoading) {
    result = { status: "loading" };
  } else if (weeks == null) {
    // The schedule lookup failed, and already said so in its own toast.
    result = { status: "loading" };
    redirect = "silent";
  } else if (seasonNumber !== loadedSeason) {
    // The schedule on hand is still the season we came from.
    result = { status: "loading" };
  } else if (!isSelectableWeek) {
    result = { status: "loading" };
    redirect = {
      header: "Unknown Week",
      message: `Week ${weekParam} isn't part of the ${seasonNumber} season, so there is nothing to show.`,
    };
  } else if (
    attemptedFor?.season !== seasonNumber ||
    attemptedFor.weekNumber !== weekNumber
  ) {
    // Scores from the week before this one are still on hand until the new ones
    // land, and week 5 of one season is not week 5 of another.
    result = { status: "loading", week };
  } else if (!scores?.scores.length) {
    result = { status: "loading", week };
    redirect = {
      header: "No Results",
      message: `There are no results for week ${weekNumber} of ${seasonNumber} yet. Upload a picks spreadsheet to see them.`,
    };
  } else {
    result = { status: "ready", week };
  }

  // Latched, because StrictMode runs effects twice and every Toast is distinct,
  // so an unlatched redirect would show the same message twice.
  const hasRedirected = useRef(false);
  useEffect(() => {
    if (redirect == null || hasRedirected.current) return;
    hasRedirected.current = true;
    if (redirect !== "silent") {
      // Deliberately additive. A failure that sent us here already said what
      // went wrong, and clearing toasts would take that message away.
      showToast(new Toast("warning", redirect.header, redirect.message));
    }
    // The week stays selected, so home opens on the week that was asked for.
    navigate("/", { replace: true });
  }, [redirect, navigate, showToast]);

  return result;
}
