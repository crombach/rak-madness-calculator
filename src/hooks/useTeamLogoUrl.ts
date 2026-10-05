import { useCallback } from "react";
import { DARK_QUERY, useSettings } from "../context/SettingsContext";
import useMediaQuery from "./useMediaQuery";

/** The size directory every ESPN team logo URL is served from. */
const LIGHT_LOGOS = "/500/";

/** ESPN's own variant of each logo, drawn to stand on a dark ground. */
const DARK_LOGOS = "/500-dark/";

/** ESPN's dark variant of a team logo, or the URL as given where it has none. */
export function darkLogoUrl(url: string): string {
  return url.replace(LIGHT_LOGOS, DARK_LOGOS);
}

/** The logo URL for the theme the document is in. */
export default function useTeamLogoUrl(): (url: string) => string {
  const { theme } = useSettings();
  const systemDark = useMediaQuery(DARK_QUERY);
  const dark = theme === "dark" || (theme === "auto" && systemDark);
  return useCallback((url) => (dark ? darkLogoUrl(url) : url), [dark]);
}
