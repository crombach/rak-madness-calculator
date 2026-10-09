import {
  ComponentProps,
  createContext,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Outlet, useNavigate } from "react-router";
import doNothing from "../../utils/doNothing";
import { PageFrame } from "../pageLayout/PageLayout";
import { ScoresView } from "../results/resultsPath";
import LogoButton from "./LogoButton";
import NavMenu from "./NavMenu";
import ScoresNavbar from "./ScoresNavbar";

/** What the page on show sets in the navbar. */
type NavbarState = {
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
};

/** The navbar of a page with no week to show: every control disabled. */
const NO_WEEK: NavbarState = {
  view: null,
  onViewChange: doNothing,
  disabled: true,
  noWeekYet: true,
  isWeekLive: false,
  season: undefined,
  week: undefined,
  pagesDisabled: true,
};

const NavbarContext = createContext<(state: NavbarState) => void>(doNothing);

function isSameState(a: NavbarState, b: NavbarState) {
  const keys = Object.keys({ ...a, ...b }) as Array<keyof NavbarState>;
  return keys.every((key) => Object.is(a[key], b[key]));
}

/**
 * Sets the navbar for the page calling it. Before paint, so the bar never shows
 * a frame of the page before. Only a change reaches the navbar, so a page that
 * re-renders on every poll leaves the bar alone.
 */
export function useAppNavbar(state: NavbarState) {
  const show = useContext(NavbarContext);
  const shown = useRef<NavbarState>(undefined);
  useLayoutEffect(() => {
    if (shown.current != null && isSameState(shown.current, state)) return;
    shown.current = state;
    show(state);
  });
}

/**
 * The layout route above every page: the logo home, the view switch with its
 * refresh, and the menu. Mounted once, so the navbar and its open menu persist
 * across route changes. Each page sets what it shows through `useAppNavbar`.
 */
export default function AppNavbar() {
  const navigate = useNavigate();
  const [
    {
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
    },
    setState,
  ] = useState(NO_WEEK);
  // Held once, so a change to the navbar does not re-render the page.
  const page = useMemo(() => <Outlet />, []);
  return (
    <NavbarContext.Provider value={setState}>
      <PageFrame
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
            <NavMenu
              season={season}
              week={week}
              pagesDisabled={pagesDisabled}
            />
          </>
        }
      >
        {page}
      </PageFrame>
    </NavbarContext.Provider>
  );
}

/** For a page with no week to show, so the navbar holds its shape. */
export function useNoWeekNavbar() {
  useAppNavbar(NO_WEEK);
}
