import { Drawer } from "@base-ui/react/drawer";
import { Menu } from "@base-ui/react/menu";
import { ReactNode, useId, useRef, useState } from "react";
import { Link, useLocation } from "react-router";
import {
  useScores,
  useIsWeekSettled,
  useKnockouts,
} from "../../context/AppDataContext";
import { useSettings } from "../../context/SettingsContext";
import cssMediaQuery from "../../hooks/cssMediaQuery";
import useMediaQuery from "../../hooks/useMediaQuery";
import getClasses from "../../utils/getClasses";
import { buttonClasses } from "../button/Button";
import {
  CloseIcon,
  HomeIcon,
  JoinIcon,
  MenuIcon,
  ScoreboardIcon,
  SettingsIcon,
  SkullOutlinedIcon,
} from "../icon/Icon";
import { BETA_MARK, BETA_WORD } from "./LogoButton";
import resultsPath, { RESULTS_PAGE, weekName } from "../results/resultsPath";
import SettingsDialog from "../settings/SettingsDialog";
import useSettingsSeen from "../settings/useSettingsSeen";
import "./NavMenu.scss";

type Week = number | string | undefined;

/** What an item's enabled rule can read. */
type NavContext = {
  isWeekSettled: boolean;
  knockouts: ReturnType<typeof useKnockouts>;
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
  /** True to show the item only with the experimental opt-in, marked β. */
  experimental?: boolean;
};

const HOME: NavItem = { label: "Home", icon: <HomeIcon />, path: () => "/" };

const GAMES: NavItem = {
  label: RESULTS_PAGE.games,
  icon: <ScoreboardIcon />,
  path: (season, week) => resultsPath(season, week, RESULTS_PAGE.games),
  disabled: ({ playerCount }) => playerCount == null,
};

const COMPARE_PLAYERS: NavItem = {
  label: RESULTS_PAGE.comparePlayers,
  icon: <JoinIcon />,
  path: (season, week) =>
    resultsPath(season, week, RESULTS_PAGE.comparePlayers),
  experimental: true,
  disabled: ({ playerCount }) => playerCount == null,
};

const KNOCKOUTS: NavItem = {
  label: RESULTS_PAGE.knockouts,
  icon: <SkullOutlinedIcon />,
  path: (season, week) => resultsPath(season, week, RESULTS_PAGE.knockouts),
  // Scores still loading, which is soon over and needs no word. A complete
  // week needs none either.
  disabled: ({ knockouts }) =>
    knockouts == null || knockouts.games.length === 0,
  disabledReason: ({ isWeekSettled, knockouts }) => {
    if (knockouts?.isUnreadable) return "Knockouts could not load";
    return !isWeekSettled && knockouts?.games.length === 0
      ? "No game knocks anyone out"
      : undefined;
  },
};

// Home leads, then the pages. Settings renders after them, outside this list.
const ITEMS: Array<NavItem> = [HOME, GAMES, KNOCKOUTS, COMPARE_PLAYERS];

const SETTINGS_LABEL = "Settings";

/** The one item that opens a dialog over the page rather than leading away. */
type SettingsEntry = { onOpen: () => void; isUnseen: boolean };

const TRIGGER_CLASSES = buttonClasses({ compact: true, iconOnly: true });

/**
 * The hamburger every page opens beside the scoreboard/picks switch. A drawer
 * from the right edge on a touch screen, a popup menu anywhere else. An
 * experimental item only with the opt-in, marked β after its name.
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
  const [query] = useState(() => cssMediaQuery("--rak-touch-screen"));
  const isTouch = useMediaQuery(query);
  const { pathname } = useLocation();
  const isWeekSettled = useIsWeekSettled();
  const knockouts = useKnockouts();
  const playerCount = useScores()?.scores.length;
  const { experimentalFeatures } = useSettings();
  const [isSettingsOpen, setSettingsOpen] = useState(false);
  const [hasSeenSettings, markSettingsSeen] = useSettingsSeen();

  const context: NavContext = {
    isWeekSettled,
    knockouts,
    playerCount,
  };
  const shown = ITEMS.filter(
    (item) => experimentalFeatures || !item.experimental,
  );
  const links = shown.map((item) => {
    const path = item.path(season, week);
    const isHeldOff = pagesDisabled && item !== HOME;
    return {
      ...item,
      name: <ItemName label={item.label} experimental={item.experimental} />,
      path,
      isCurrent: pathname === path,
      disabled: isHeldOff || (item.disabled?.(context) ?? false),
      disabledReason: isHeldOff ? undefined : item.disabledReason?.(context),
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
      {isTouch ? (
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
  /** The label, and the β after it on an experimental item. */
  name: ReactNode;
  path: string;
  isCurrent: boolean;
  disabled: boolean;
  disabledReason?: string;
};

function ItemName({
  label,
  experimental,
}: {
  label: string;
  experimental?: boolean;
}) {
  if (!experimental) {
    return label;
  }
  return (
    <span>
      {label}
      <span className="nav-menu__beta" aria-hidden="true">
        {BETA_MARK}
      </span>
      {/* A space of its own, or the accessible name runs the words together. */}{" "}
      <span className="nav-menu__sr-only">{BETA_WORD}</span>
    </span>
  );
}

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
              ({
                label,
                name,
                icon,
                path,
                isCurrent,
                disabled,
                disabledReason,
              }) =>
                disabled || disabledReason != null ? (
                  <DisabledNavItem
                    key={label}
                    name={name}
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
                    {name}
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
  name,
  reason,
  reasonId,
}: {
  icon: ReactNode;
  name: ReactNode;
  reason?: string;
  reasonId: string;
}) {
  return (
    <>
      {icon}
      {name}
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
  name,
  icon,
  reason,
  isCurrent,
}: {
  name: ReactNode;
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
        name={name}
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
                    name,
                    icon,
                    path,
                    isCurrent,
                    disabled,
                    disabledReason,
                  }) => (
                    <li key={label}>
                      {disabled || disabledReason != null ? (
                        <DisabledDrawerItem
                          name={name}
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
                          {name}
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
  name,
  icon,
  reason,
  isCurrent,
}: {
  name: ReactNode;
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
        name={name}
        reason={reason}
        reasonId={reasonId}
      />
    </span>
  );
}
