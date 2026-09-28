import { Menu } from "@base-ui/react/menu";
import { Link, useLocation } from "react-router";
import { buttonClasses } from "../button/Button";
import { MenuIcon } from "../icon/Icon";
import resultsPath, { ResultsPage } from "../results/resultsPath";
import "./NavMenu.scss";

const ITEMS: Array<ResultsPage> = ["Swing Games"];

/** The hamburger every page opens beside the scoreboard/picks switch. */
export default function NavMenu({
  season,
  week,
  disabled = false,
}: {
  season: number | string | undefined;
  week: number | string | undefined;
  disabled?: boolean;
}) {
  const location = useLocation();

  return (
    <>
      <div className="navbar__divider" />
      <Menu.Root>
        <Menu.Trigger
          className={buttonClasses({ compact: true, iconOnly: true })}
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
              {ITEMS.map((item) => {
                const path = resultsPath(season, week, item);
                return (
                  <Menu.LinkItem
                    key={item}
                    closeOnClick
                    className="nav-menu__item"
                    render={<Link to={path} />}
                    aria-current={
                      location.pathname === path ? "page" : undefined
                    }
                  >
                    {item}
                  </Menu.LinkItem>
                );
              })}
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>
    </>
  );
}
