import { Drawer } from "@base-ui/react/drawer";
import { Menu } from "@base-ui/react/menu";
import { ReactNode, useState } from "react";
import { Link, useLocation } from "react-router";
import useMediaQuery from "../../hooks/useMediaQuery";
import { buttonClasses } from "../button/Button";
import { CloseIcon, HomeIcon, MenuIcon, SwapVertIcon } from "../icon/Icon";
import resultsPath from "../results/resultsPath";
import "./NavMenu.scss";

type Week = number | string | undefined;

type NavItem = {
  label: string;
  icon: ReactNode;
  path: (season: Week, week: Week) => string;
};

const ITEMS: Array<NavItem> = [
  { label: "Home", icon: <HomeIcon />, path: () => "/" },
  {
    label: "Swing Games",
    icon: <SwapVertIcon />,
    path: (season, week) => resultsPath(season, week, "Swing Games"),
  },
];

const TRIGGER_CLASSES = buttonClasses({ compact: true, iconOnly: true });

/** The query `index.scss` exports for everything short of `wide-screen`. */
function belowWideQuery(): string {
  return getComputedStyle(document.documentElement)
    .getPropertyValue("--rak-below-wide")
    .trim()
    .replace(/^"|"$/g, "");
}

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
  const [query] = useState(belowWideQuery);
  const isNarrow = useMediaQuery(query);
  const { pathname } = useLocation();
  const links = ITEMS.map((item) => {
    const path = item.path(season, week);
    return { ...item, path, isCurrent: pathname === path };
  });

  return (
    <>
      <div className="navbar__divider" />
      {isNarrow ? (
        <NavDrawer
          season={season}
          week={week}
          links={links}
          disabled={disabled}
        />
      ) : (
        <NavPopup links={links} disabled={disabled} />
      )}
    </>
  );
}

type NavLink = Omit<NavItem, "path"> & { path: string; isCurrent: boolean };

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
            {links.map(({ label, icon, path, isCurrent }) => (
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
            ))}
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}

function NavDrawer({
  season,
  week,
  links,
  disabled,
}: {
  season: Week;
  week: Week;
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
            {week != null && (
              <p className="nav-drawer__week">
                {season} · Week {week}
              </p>
            )}
            <nav aria-label="Pages">
              <ul className="nav-drawer__list">
                {links.map(({ label, icon, path, isCurrent }) => (
                  <li key={label}>
                    <Link
                      to={path}
                      className="nav-drawer__item"
                      aria-current={isCurrent ? "page" : undefined}
                      onClick={() => setOpen(false)}
                    >
                      {icon}
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </Drawer.Popup>
        </Drawer.Viewport>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
