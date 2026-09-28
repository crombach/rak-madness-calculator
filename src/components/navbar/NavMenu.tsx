import { Drawer } from "@base-ui/react/drawer";
import { Menu } from "@base-ui/react/menu";
import { Tooltip } from "@base-ui/react/tooltip";
import { ReactNode, useId, useState } from "react";
import { Link, useLocation } from "react-router";
import { useIsWeekWon, useSwingGames } from "../../context/AppDataContext";
import { useSettings } from "../../context/SettingsContext";
import cssMediaQuery from "../../hooks/cssMediaQuery";
import useMediaQuery from "../../hooks/useMediaQuery";
import { buttonClasses } from "../button/Button";
import { CloseIcon, HomeIcon, MenuIcon, SwapVertIcon } from "../icon/Icon";
import resultsPath from "../results/resultsPath";
import "./NavMenu.scss";

type Week = number | string | undefined;

/** What an item's visibility and enabled rules can read. */
type NavContext = {
  isWeekWon: boolean;
  swingGames: ReturnType<typeof useSwingGames>;
};

type NavItem = {
  label: string;
  icon: ReactNode;
  path: (season: Week, week: Week) => string;
  /** Left out for an item that always shows. */
  hidden?: (context: NavContext) => boolean;
  /** A reason to show and disable the item for, or undefined to leave it enabled. */
  disabledReason?: (context: NavContext) => string | undefined;
};

const ITEMS: Array<NavItem> = [
  { label: "Home", icon: <HomeIcon />, path: () => "/" },
  {
    label: "Swing Games",
    icon: <SwapVertIcon />,
    path: (season, week) => resultsPath(season, week, "Swing Games"),
    hidden: ({ isWeekWon }) => isWeekWon,
    disabledReason: ({ swingGames }) => {
      if (swingGames == null) return "Scores still loading";
      if (swingGames.games.length === 0) return "No game knocks anyone out";
      return undefined;
    },
  },
];

const TRIGGER_CLASSES = buttonClasses({ compact: true, iconOnly: true });

// Shorter than Base UI's default 600ms, since the reason is short enough to skim fast.
const TOOLTIP_DELAY_MS = 200;

/**
 * The hamburger every page opens beside the scoreboard/picks switch. A drawer
 * from the right edge below `wide-screen`, a popup menu at it and above.
 */
export default function NavMenu({
  season,
  week,
  disabled = false,
}: {
  season: Week;
  week: Week;
  disabled?: boolean;
}) {
  const [query] = useState(() => cssMediaQuery("--rak-below-wide"));
  const isNarrow = useMediaQuery(query);
  const { pathname } = useLocation();
  const isWeekWon = useIsWeekWon();
  const swingGames = useSwingGames();
  const { experimentalFeatures } = useSettings();
  if (!experimentalFeatures) return null;

  const context: NavContext = { isWeekWon, swingGames };
  const links = ITEMS.filter((item) => !item.hidden?.(context)).map((item) => {
    const path = item.path(season, week);
    return {
      ...item,
      path,
      isCurrent: pathname === path,
      disabledReason: item.disabledReason?.(context),
    };
  });

  return (
    <>
      <div className="navbar__divider" />
      {isNarrow ? (
        <NavDrawer links={links} disabled={disabled} />
      ) : (
        <NavPopup links={links} disabled={disabled} />
      )}
    </>
  );
}

type NavLink = Omit<NavItem, "path" | "disabledReason"> & {
  path: string;
  isCurrent: boolean;
  disabledReason?: string;
};

function NavPopup({
  links,
  disabled,
}: {
  links: Array<NavLink>;
  disabled: boolean;
}) {
  return (
    <Menu.Root>
      <Menu.Trigger
        className={TRIGGER_CLASSES}
        aria-label="Menu"
        disabled={disabled}
      >
        <MenuIcon />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner
          className="nav-menu__positioner"
          align="end"
          sideOffset={4}
        >
          <Menu.Popup className="nav-menu__popup">
            {links.map(({ label, icon, path, isCurrent, disabledReason }) =>
              disabledReason != null ? (
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
                  closeOnClick
                  className="nav-menu__item"
                  render={<Link to={path} />}
                  aria-current={isCurrent ? "page" : undefined}
                >
                  {icon}
                  {label}
                </Menu.LinkItem>
              ),
            )}
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}

/**
 * A disabled item's reason, read by a screen reader only. Hidden from the item's
 * name, which it sits inside, so it reaches the reader once, as the description.
 */
function DisabledReason({ id, reason }: { id: string; reason: string }) {
  return (
    <span id={id} className="nav-menu__sr-only" aria-hidden="true">
      {reason}
    </span>
  );
}

/**
 * A disabled popup item. Base UI keeps `Menu.Item` focusable while disabled, so
 * the reason shows as a tooltip on hover or keyboard focus, and sits in an
 * `aria-describedby` span too, for a reader neither reaches.
 */
function DisabledNavItem({
  label,
  icon,
  reason,
  isCurrent,
}: {
  label: string;
  icon: ReactNode;
  reason: string;
  isCurrent: boolean;
}) {
  const reasonId = useId();
  return (
    <Tooltip.Root>
      <Tooltip.Trigger
        delay={TOOLTIP_DELAY_MS}
        render={
          <Menu.Item
            disabled
            className="nav-menu__item"
            aria-current={isCurrent ? "page" : undefined}
            aria-describedby={reasonId}
          />
        }
      >
        {icon}
        {label}
        <DisabledReason id={reasonId} reason={reason} />
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Positioner
          className="nav-menu__tooltip-positioner"
          side="left"
          align="center"
          sideOffset={4}
        >
          <Tooltip.Popup role="tooltip" className="nav-menu__tooltip">
            {reason}
          </Tooltip.Popup>
        </Tooltip.Positioner>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}

function NavDrawer({
  links,
  disabled,
}: {
  links: Array<NavLink>;
  disabled: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Drawer.Root open={open} onOpenChange={setOpen} swipeDirection="right">
      <Drawer.Trigger
        className={TRIGGER_CLASSES}
        aria-label="Menu"
        disabled={disabled}
      >
        <MenuIcon />
      </Drawer.Trigger>
      <Drawer.Portal>
        <Drawer.Backdrop className="nav-drawer__backdrop" />
        <Drawer.Viewport className="nav-drawer__viewport">
          <Drawer.Popup className="nav-drawer__popup">
            <header className="nav-drawer__header">
              <Drawer.Title className="nav-drawer__title">Menu</Drawer.Title>
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
                  ({ label, icon, path, isCurrent, disabledReason }) => (
                    <li key={label}>
                      {disabledReason != null ? (
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
                          onClick={() => setOpen(false)}
                        >
                          {icon}
                          {label}
                        </Link>
                      )}
                    </li>
                  ),
                )}
              </ul>
            </nav>
          </Drawer.Popup>
        </Drawer.Viewport>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

/** A disabled drawer row. The reason reaches only a screen reader, through this span. */
function DisabledDrawerItem({
  label,
  icon,
  reason,
  isCurrent,
}: {
  label: string;
  icon: ReactNode;
  reason: string;
  isCurrent: boolean;
}) {
  const reasonId = useId();
  return (
    <span
      role="link"
      // Focusable like the popup's disabled item, so Tab reaches its reason too.
      tabIndex={0}
      className="nav-drawer__item"
      aria-disabled="true"
      aria-current={isCurrent ? "page" : undefined}
      aria-describedby={reasonId}
    >
      {icon}
      {label}
      <DisabledReason id={reasonId} reason={reason} />
    </span>
  );
}
