import { Drawer } from "@base-ui/react/drawer";
import { Menu } from "@base-ui/react/menu";
import { ReactNode, useId, useState } from "react";
import { Link, useLocation } from "react-router";
import { useIsWeekWon, useSwingGames } from "../../context/AppDataContext";
import { useSettings } from "../../context/SettingsContext";
import cssMediaQuery from "../../hooks/cssMediaQuery";
import useMediaQuery from "../../hooks/useMediaQuery";
import getClasses from "../../utils/getClasses";
import { buttonClasses } from "../button/Button";
import { CloseIcon, HomeIcon, MenuIcon, SwapVertIcon } from "../icon/Icon";
import resultsPath, { RESULTS_PAGE, weekName } from "../results/resultsPath";
import "./NavMenu.scss";

type Week = number | string | undefined;

/** What an item's enabled rule can read. */
type NavContext = {
  isWeekWon: boolean;
  swingGames: ReturnType<typeof useSwingGames>;
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

const ITEMS: Array<NavItem> = [
  { label: "Home", icon: <HomeIcon />, path: () => "/" },
  {
    label: RESULTS_PAGE.swingGames,
    icon: <SwapVertIcon />,
    path: (season, week) => resultsPath(season, week, RESULTS_PAGE.swingGames),
    // Scores still loading, which is soon over and needs no word.
    disabled: ({ swingGames }) => swingGames == null,
    disabledReason: ({ isWeekWon, swingGames }) => {
      if (isWeekWon) return "Week already decided";
      if (swingGames?.games.length === 0) return "No game knocks anyone out";
      return undefined;
    },
  },
];

const TRIGGER_CLASSES = buttonClasses({ compact: true, iconOnly: true });

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
  const links = ITEMS.map((item) => {
    const path = item.path(season, week);
    return {
      ...item,
      path,
      isCurrent: pathname === path,
      disabled: item.disabled?.(context) ?? false,
      disabledReason: item.disabledReason?.(context),
    };
  });

  return (
    <>
      <div className="navbar__divider" />
      {isNarrow ? (
        <NavDrawer
          links={links}
          disabled={disabled}
          title={
            season != null && week != null ? weekName(season, week) : undefined
          }
        />
      ) : (
        <NavPopup links={links} disabled={disabled} />
      )}
    </>
  );
}

type NavLink = Omit<NavItem, "path" | "disabled" | "disabledReason"> & {
  path: string;
  isCurrent: boolean;
  disabled: boolean;
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
  disabled,
  title,
}: {
  links: Array<NavLink>;
  disabled: boolean;
  /** The week the pages are for, shown atop the drawer. */
  title?: string;
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
