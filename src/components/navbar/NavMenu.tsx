import { Drawer } from "@base-ui/react/drawer";
import { Menu } from "@base-ui/react/menu";
import { Tooltip } from "@base-ui/react/tooltip";
import { ReactElement, ReactNode, useId, useState } from "react";
import { Link, useLocation } from "react-router";
import { useIsWeekWon, useSwingGames } from "../../context/AppDataContext";
import { useSettings } from "../../context/SettingsContext";
import cssMediaQuery from "../../hooks/cssMediaQuery";
import useMediaQuery from "../../hooks/useMediaQuery";
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
  /** Why the item is disabled, or undefined to leave it enabled. */
  disabledReason?: (context: NavContext) => string | undefined;
};

const ITEMS: Array<NavItem> = [
  { label: "Home", icon: <HomeIcon />, path: () => "/" },
  {
    label: RESULTS_PAGE.swingGames,
    icon: <SwapVertIcon />,
    path: (season, week) => resultsPath(season, week, RESULTS_PAGE.swingGames),
    disabledReason: ({ isWeekWon, swingGames }) => {
      if (swingGames == null) return "Scores still loading";
      if (isWeekWon) return "Week already won";
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
  const links = ITEMS.map((item) => {
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
 * A disabled item's reason as a tooltip, on hover, keyboard focus, or a tap.
 * Base UI opens a tooltip for neither a tap nor a click, so a press opens it here,
 * and a press anywhere else closes it again.
 */
function ReasonTooltip({
  reason,
  side,
  align,
  className,
  trigger,
  children,
}: {
  reason: string;
  side: "left" | "bottom";
  align: "center" | "end";
  className: string;
  trigger: ReactElement;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Tooltip.Root open={open} onOpenChange={setOpen}>
      <Tooltip.Trigger
        delay={TOOLTIP_DELAY_MS}
        closeOnClick={false}
        render={trigger}
        // Capture, since a disabled Base UI item drops its own pointer handlers.
        onPointerDownCapture={() => setOpen(true)}
      >
        {children}
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Positioner
          className={className}
          side={side}
          align={align}
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

/**
 * A disabled popup item. Base UI keeps `Menu.Item` focusable while disabled, so
 * keyboard focus reaches its reason, which an `aria-describedby` span holds too.
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
    <ReasonTooltip
      reason={reason}
      side="left"
      align="center"
      className="nav-menu__tooltip-positioner"
      trigger={
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
    </ReasonTooltip>
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

/**
 * A disabled drawer row. Its reason shows below it on a tap, since the drawer
 * leaves no room to its left, and at its end, clear of the next row's label.
 */
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
    <ReasonTooltip
      reason={reason}
      side="bottom"
      align="end"
      className="nav-menu__tooltip-positioner nav-menu__tooltip-positioner--drawer"
      trigger={
        <span
          role="link"
          // Focusable like the popup's disabled item, so Tab reaches its reason too.
          tabIndex={0}
          className="nav-drawer__item"
          aria-disabled="true"
          aria-current={isCurrent ? "page" : undefined}
          aria-describedby={reasonId}
        />
      }
    >
      {icon}
      {label}
      <DisabledReason id={reasonId} reason={reason} />
    </ReasonTooltip>
  );
}
