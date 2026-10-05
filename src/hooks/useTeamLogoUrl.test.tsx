import { renderHook } from "@testing-library/react";
import { PropsWithChildren } from "react";
import { SettingsContextProvider, THEME_KEY } from "../context/SettingsContext";
import { stubMatchMedia } from "../setupTests";
import useTeamLogoUrl, { darkLogoUrl } from "./useTeamLogoUrl";

const PRO = "https://a.espncdn.com/i/teamlogos/nfl/500/scoreboard/car.png";
const PRO_DARK =
  "https://a.espncdn.com/i/teamlogos/nfl/500-dark/scoreboard/car.png";
const COLLEGE = "https://a.espncdn.com/i/teamlogos/ncaa/500/61.png";

function logoUrlIn(): (url: string) => string {
  const wrapper = ({ children }: PropsWithChildren) => (
    <SettingsContextProvider>{children}</SettingsContextProvider>
  );
  return renderHook(() => useTeamLogoUrl(), { wrapper }).result.current;
}

afterEach(() => {
  localStorage.clear();
});

describe("darkLogoUrl", () => {
  it("points a pro or college logo at ESPN's dark variant", () => {
    expect(darkLogoUrl(PRO)).toBe(PRO_DARK);
    expect(darkLogoUrl(COLLEGE)).toBe(
      "https://a.espncdn.com/i/teamlogos/ncaa/500-dark/61.png",
    );
  });

  it("leaves a URL with no size directory as it is", () => {
    expect(darkLogoUrl("https://espn.com/kc.png")).toBe(
      "https://espn.com/kc.png",
    );
  });
});

describe("useTeamLogoUrl", () => {
  it("gives the dark variant in the dark theme", () => {
    localStorage.setItem(THEME_KEY, "dark");
    expect(logoUrlIn()(PRO)).toBe(PRO_DARK);
  });

  it("gives the logo as it is in the light theme, whatever the system says", () => {
    stubMatchMedia(true);
    localStorage.setItem(THEME_KEY, "light");
    expect(logoUrlIn()(PRO)).toBe(PRO);
  });

  it("follows the system on auto", () => {
    stubMatchMedia(true);
    expect(logoUrlIn()(PRO)).toBe(PRO_DARK);
  });
});
