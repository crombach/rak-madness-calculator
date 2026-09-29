import { Drawer } from "@base-ui/react/drawer";
import { Menu } from "@base-ui/react/menu";
import { ReactNode, useId, useRef, useState } from "react";
import { Link, useLocation } from "react-router";
import {
  useAppData,
  useIsWeekSettled,
  useIsWeekWon,
  useSwingGames,
} from "../../context/AppDataContext";
import { useSettings } from "../../context/SettingsContext";
import cssMediaQuery from "../../hooks/cssMediaQuery";
import useMediaQuery from "../../hooks/useMediaQuery";
import getClasses from "../../utils/getClasses";
import { buttonClasses } from "../button/Button";
import {
  CloseIcon,
  GroupIcon,
  HomeIcon,
  MenuIcon,
  ScoreboardIcon,
  SettingsIcon,
  SwapVertIcon,
} from "../icon/Icon";
import resultsPath, { RESULTS_PAGE, weekName } from "../results/resultsPath";
import SettingsDialog from "../settings/SettingsDialog";
import useSettingsSeen from "../settings/useSettingsSeen";
import "./NavMenu.scss";

type Week = number | string | undefined;

/** What an item's enabled rule can read. */
type NavContext = {
  isWeekSettled: boolean;
  isWeekWon: boolean;
  swingGames: ReturnType<typeof useSwingGames>;
  /** How many players the week has, or undefined while its scores load. */
  playerCount?: number;
};

type NavItem = {
  label: string;
  icon: ReactNode;
  path: (season: Week, week: Week) => string;
  /** True to disable the item with no reason given. */
  disabled?: (context: NavContext) => boolean;
  /** Why the item is disabled, or undefined to leave it enabled. */
  disabledReason?: (context: NavContext) => string | undefined;
};

const HOME: NavItem = { label: "Home", icon: <HomeIcon />, path: () => "/" };

const PAGES: Array<NavItem> = [
  {
    label: RESULTS_PAGE.swingGames,
    icon: <SwapVertIcon />,
    path: (season, week) => resultsPath(season, week, RESULTS_PAGE.swingGames),
    // Scores still loading, which is soon over and needs no word. A complete
    // week needs none either.
    disabled: ({ isWeekSettled, swingGames }) =>
      isWeekSettled || swingGames == null,
    disabledReason: ({ isWeekSettled, isWeekWon, swingGames }) => {
      if (isWeekSettled) return undefined;
      if (isWeekWon) return "Week is decided";
      if (swingGames?.games.length === 0) return "No game knocks anyone out";
      return undefined;
    },
  },
  {
    label: RESULTS_PAGE.comparePlayers,
    icon: <GroupIcon />,
    path: (season, week) =>
      resultsPath(season, week, RESULTS_PAGE.comparePlayers),
    disabled: ({ playerCount }) => playerCount == null || playerCount < 2,
    disabledReason: ({ isWeekSettled, playerCount }) =>
      !isWeekSettled && playerCount != null && playerCount < 2
        ? "Needs two players"
        : undefined,
  },
  {
    label: RESULTS_PAGE.games,
    icon: <ScoreboardIcon />,
    path: (season, week) => resultsPath(season, week, RESULTS_PAGE.games),
    disabled: ({ playerCount }) => playerCount == null,
  },
];

// Home leads, the rest run alphabetically. Settings follows them all.
const ITEMS: Array<NavItem> = [
  HOME,
  ...[...PAGES].sort((a, b) => a.label.localeCompare(b.label)),
];

const SETTINGS_LABEL = "Settings";

/** The one item that opens a dialog over the page rather than leading away. */
type SettingsEntry = { onOpen: () => void; isUnseen: boolean };

const TRIGGER_CLASSES = buttonClasses({ compact: true, iconOnly: true });

/**
 * The hamburger every page opens beside the scoreboard/picks switch. A drawer
 * from the right edge below `wide-screen`, a popup menu at it and above. Only
 * Home and Settings without the experimental opt-in.
 */
export default function NavMenu({
  season,
  week,
  pagesDisabled = false,
}: {
  season: Week;
  week: Week;
  /** True to disable every item but Home and Settings, with no reason given. */
  pagesDisabled?: boolean;
}) {
  const [query] = useState(() => cssMediaQuery("--rak-below-wide"));
  const isNarrow = useMediaQuery(query);
  const { pathname } = useLocation();
  const isWeekSettled = useIsWeekSettled();
  const isWeekWon = useIsWeekWon();
  const swingGames = useSwingGames();
  const playerCount = useAppData().scores?.scores.length;
  const { experimentalFeatures } = useSettings();
  const [isSettingsOpen, setSettingsOpen] = useState(false);
  const [hasSeenSettings, markSettingsSeen] = useSettingsSeen();

  const context: NavContext = {
    isWeekSettled,
    isWeekWon,
    swingGames,
    playerCount,
  };
  const links = (experimentalFeatures ? ITEMS : [HOME]).map((item) => {
    const path = item.path(season, week);
    const isPage = item !== HOME;
    return {
      ...item,
      path,
      isCurrent: pathname === path,
      disabled:
        (isPage && pagesDisabled) || (item.disabled?.(context) ?? false),
      disabledReason: item.disabledReason?.(context),
    };
  });
  const settings: SettingsEntry = {
    onOpen: () => {
      setSettingsOpen(true);
      markSettingsSeen();
    },
    isUnseen: !hasSeenSettings,
  };

  return (
    <>
      <div className="navbar__divider" />
      {isNarrow ? (
        <NavDrawer
          links={links}
          settings={settings}
          title={
            season != null && week != null ? weekName(season, week) : undefined
          }
        />
      ) : (
        <NavPopup links={links} settings={settings} />
      )}
      <SettingsDialog open={isSettingsOpen} onOpenChange={setSettingsOpen} />
    </>
  );
}

type NavLink = Omit<NavItem, "path" | "disabled" | "disabledReason"> & {
  path: string;
  isCurrent: boolean;
  disabled: boolean;
  disabledReason?: string;
};

/**
 * A menu's open state, held open until the page a link leads to is on screen.
 *
 * The router swaps pages in a transition, which commits after the click. So the
 * menu closes in the render that swaps the page, never on the click, or it slides
 * away over the page being left.
 */
function useOpenUntilNavigated(): [boolean, (open: boolean) => void] {
  const [open, setOpen] = useState(false);
  const { key } = useLocation();
  const [shownKey, setShownKey] = useState(key);
  if (key !== shownKey) {
    setShownKey(key);
    setOpen(false);
  }
  return [open, setOpen];
}

function NavPopup({
  links,
  settings,
}: {
  links: Array<NavLink>;
  settings: SettingsEntry;
}) {
  const [open, setOpen] = useOpenUntilNavigated();
  // The key's face sinks under a press. Anchored to the key, the popup rides
  // that travel in the browsers that report it, so it hangs off a box that stays.
  const anchorRef = useRef<HTMLSpanElement>(null);
  return (
    <Menu.Root open={open} onOpenChange={setOpen}>
      <span ref={anchorRef} className="nav-menu__anchor">
        <Menu.Trigger className={TRIGGER_CLASSES} aria-label="Menu">
          <MenuIcon />
        </Menu.Trigger>
      </span>
      <Menu.Portal>
        <Menu.Positioner
          className="nav-menu__positioner"
          anchor={anchorRef}
          align="end"
          sideOffset={4}
        >
          <Menu.Popup className="nav-menu__popup">
            {links.map(
              ({ label, icon, path, isCurrent, disabled, disabledReason }) =>
                disabled || disabledReason != null ? (
                  <DisabledNavItem
                    key={label}
                    label={label}
                    icon={icon}
                    reason={disabledReason}
                    isCurrent={isCurrent}
                  />
                ) : (
                  <Menu.LinkItem
                    key={label}
                    closeOnClick={isCurrent}
                    className="nav-menu__item"
                    render={<Link to={path} />}
                    aria-current={isCurrent ? "page" : undefined}
                  >
                    {icon}
                    {label}
                  </Menu.LinkItem>
                ),
            )}
            <Menu.Item
              className={getClasses("nav-menu__item", {
                "nav-menu__settings--unseen": settings.isUnseen,
              })}
              onClick={settings.onOpen}
            >
              <SettingsIcon />
              {SETTINGS_LABEL}
            </Menu.Item>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}

/**
 * A disabled item's icon and name, and any reason in a smaller line under the
 * name. Give the item the `nav-menu__with-reason` class and `reasonId` as its
 * `aria-describedby` when there is a reason.
 */
function DisabledContent({
  icon,
  label,
  reason,
  reasonId,
}: {
  icon: ReactNode;
  label: string;
  reason?: string;
  reasonId: string;
}) {
  return (
    <>
      {icon}
      {label}
      {/* Kept out of the item's name, so a screen reader hears it once, as the
          description. */}
      {reason != null && (
        <span id={reasonId} className="nav-menu__reason" aria-hidden="true">
          {reason}
        </span>
      )}
    </>
  );
}

/** A disabled popup item. Base UI keeps `Menu.Item` focusable while disabled. */
function DisabledNavItem({
  label,
  icon,
  reason,
  isCurrent,
}: {
  label: string;
  icon: ReactNode;
  reason?: string;
  isCurrent: boolean;
}) {
  const reasonId = useId();
  return (
    <Menu.Item
      disabled
      className={getClasses("nav-menu__item", {
        "nav-menu__with-reason": reason != null,
      })}
      aria-current={isCurrent ? "page" : undefined}
      aria-describedby={reason != null ? reasonId : undefined}
    >
      <DisabledContent
        icon={icon}
        label={label}
        reason={reason}
        reasonId={reasonId}
      />
    </Menu.Item>
  );
}

function NavDrawer({
  links,
  settings,
  title,
}: {
  links: Array<NavLink>;
  settings: SettingsEntry;
  /** The week the pages are for, shown atop the drawer. */
  title?: string;
}) {
  const [open, setOpen] = useOpenUntilNavigated();

  return (
    <Drawer.Root open={open} onOpenChange={setOpen} swipeDirection="right">
      <Drawer.Trigger className={TRIGGER_CLASSES} aria-label="Menu">
        <MenuIcon />
      </Drawer.Trigger>
      <Drawer.Portal>
        <Drawer.Backdrop className="nav-drawer__backdrop" />
        <Drawer.Viewport className="nav-drawer__viewport">
          <Drawer.Popup className="nav-drawer__popup">
            <header className="nav-drawer__header">
              <Drawer.Title className="nav-menu__sr-only">Menu</Drawer.Title>
              {title != null && (
                <Drawer.Description className="nav-drawer__title">
                  {title}
                </Drawer.Description>
              )}
              <Drawer.Close
                className={buttonClasses({ variant: "soft", iconOnly: true })}
                aria-label="Close"
              >
                <CloseIcon />
              </Drawer.Close>
            </header>
            <nav aria-label="Pages">
              <ul className="nav-drawer__list">
                {links.map(
                  ({
                    label,
                    icon,
                    path,
                    isCurrent,
                    disabled,
                    disabledReason,
                  }) => (
                    <li key={label}>
                      {disabled || disabledReason != null ? (
                        <DisabledDrawerItem
                          label={label}
                          icon={icon}
                          reason={disabledReason}
                          isCurrent={isCurrent}
                        />
                      ) : (
                        <Link
                          to={path}
                          className="nav-drawer__item"
                          aria-current={isCurrent ? "page" : undefined}
                          onClick={() => isCurrent && setOpen(false)}
                        >
                          {icon}
                          {label}
                        </Link>
                      )}
                    </li>
                  ),
                )}
                <li>
                  <button
                    type="button"
                    className={getClasses("nav-drawer__item", {
                      "nav-menu__settings--unseen": settings.isUnseen,
                    })}
                    onClick={() => {
                      setOpen(false);
                      settings.onOpen();
                    }}
                  >
                    <SettingsIcon />
                    {SETTINGS_LABEL}
                  </button>
                </li>
              </ul>
            </nav>
          </Drawer.Popup>
        </Drawer.Viewport>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

/** A disabled drawer row. */
function DisabledDrawerItem({
  label,
  icon,
  reason,
  isCurrent,
}: {
  label: string;
  icon: ReactNode;
  reason?: string;
  isCurrent: boolean;
}) {
  const reasonId = useId();
  return (
    <span
      role="link"
      // Focusable like the popup's disabled item, so Tab reaches its reason too.
      tabIndex={0}
      className={getClasses("nav-drawer__item", {
        "nav-menu__with-reason": reason != null,
      })}
      aria-disabled="true"
      aria-current={isCurrent ? "page" : undefined}
      aria-describedby={reason != null ? reasonId : undefined}
    >
      <DisabledContent
        icon={icon}
        label={label}
        reason={reason}
        reasonId={reasonId}
      />
    </span>
  );
}
