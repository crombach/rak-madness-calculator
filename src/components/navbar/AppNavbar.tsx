import { ComponentProps } from "react";
import { useNavigate } from "react-router";
import doNothing from "../../utils/doNothing";
import PageLayout from "../pageLayout/PageLayout";
import { ScoresView } from "../results/resultsPath";
import LogoButton from "./LogoButton";
import NavMenu from "./NavMenu";
import ScoresNavbar from "./ScoresNavbar";

type Chrome = Omit<
  ComponentProps<typeof PageLayout>,
  "navbarLeft" | "navbarRight"
>;

/**
 * The page and the navbar every route puts on it: the logo home, the view
 * switch with its refresh, and the menu. Shown on the home page and the results
 * routes alike, so the bar looks the same before its own routes exist as it
 * does on them.
 */
export default function AppNavbar({
  view,
  onViewChange,
  onRefresh = doNothing,
  isRefreshing = false,
  disabled,
  noWeekYet,
  isWeekLive,
  season,
  week,
  pagesDisabled,
  ...page
}: Chrome & {
  view: ScoresView | null;
  onViewChange: (view: ScoresView) => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  /** Keeps the switch's shape while a week loads. */
  disabled: boolean;
  noWeekYet?: boolean;
  isWeekLive: boolean;
  season: ComponentProps<typeof NavMenu>["season"];
  week: ComponentProps<typeof NavMenu>["week"];
  /** Disables every menu page but Home and Settings. */
  pagesDisabled: boolean;
}) {
  const navigate = useNavigate();
  return (
    <PageLayout
      {...page}
      navbarLeft={<LogoButton onClick={() => navigate("/")} />}
      navbarRight={
        <>
          <ScoresNavbar
            view={view}
            disabled={disabled}
            noWeekYet={noWeekYet}
            isWeekLive={isWeekLive}
            onViewChange={onViewChange}
            onRefresh={onRefresh}
            isRefreshing={isRefreshing}
          />
          <NavMenu season={season} week={week} pagesDisabled={pagesDisabled} />
        </>
      }
    />
  );
}
