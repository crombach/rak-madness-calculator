import { useCallback } from "react";
import { DARK_QUERY, useSetting } from "../context/SettingsContext";
import useMediaQuery from "./useMediaQuery";

/** The size directory of an ESPN team logo URL. */
const LIGHT_LOGOS = "/500/";

/** ESPN's own variant of each logo, drawn to stand on a dark ground. */
const DARK_LOGOS = "/500-dark/";

/**
 * The URL with its size directory swapped for ESPN's dark one. A URL with no size
 * directory comes back unchanged.
 */
export function darkLogoUrl(url: string): string {
  return url.replace(LIGHT_LOGOS, DARK_LOGOS);
}

/** The logo URL for the theme the document is in. */
export default function useTeamLogoUrl(): (url: string) => string {
  const theme = useSetting("theme");
  const systemDark = useMediaQuery(DARK_QUERY);
  const dark = theme === "dark" || (theme === "auto" && systemDark);
  return useCallback((url) => (dark ? darkLogoUrl(url) : url), [dark]);
}
