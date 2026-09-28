import { render, screen, waitFor, within } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";
import NavMenu from "./NavMenu";

const SEASON = 2024;
const WEEK = 3;
const SWINGS_PATH = `/${SEASON}/${WEEK}/swings`;

/** Names the URL a click landed on, from the router's own history. */
function Landed() {
  return <span data-testid="landed">{useLocation().pathname}</span>;
}

function mount({ disabled = false, hasWeek = true, at = "/" } = {}) {
  const user = userEvent.setup();
  render(
    <MemoryRouter initialEntries={[at]}>
      <NavMenu
        season={SEASON}
        week={hasWeek ? WEEK : undefined}
        disabled={disabled}
      />
      <Routes>
        <Route path="*" element={<Landed />} />
      </Routes>
    </MemoryRouter>,
  );
  return user;
}

function trigger() {
  return screen.getByRole("button", { name: "Menu" });
}

describe("NavMenu", () => {
  it('names its trigger "Menu"', () => {
    mount();

    expect(trigger()).toBeInTheDocument();
  });

  describe("at wide-screen", () => {
    it("lists Home and Swing Games", async () => {
      const user = mount();
      await user.click(trigger());

      const items = await screen.findAllByRole("menuitem");

      expect(items.map((item) => item.textContent)).toEqual([
        "Home",
        "Swing Games",
      ]);
    });

    it("marks the page it is on as current", async () => {
      const user = mount();
      await user.click(trigger());

      expect(
        await screen.findByRole("menuitem", { name: "Home" }),
      ).toHaveAttribute("aria-current", "page");
      expect(
        screen.getByRole("menuitem", { name: "Swing Games" }),
      ).not.toHaveAttribute("aria-current");
    });

    it("opens on a click and highlights the first item on ArrowDown", async () => {
      const user = mount();
      await user.click(trigger());
      const item = await screen.findByRole("menuitem", { name: "Home" });

      await user.keyboard("{ArrowDown}");

      expect(item).toHaveFocus();
    });

    it("returns focus to the trigger on Escape", async () => {
      const user = mount();
      await user.click(trigger());
      await screen.findByRole("menuitem", { name: "Swing Games" });

      await user.keyboard("{Escape}");

      await waitFor(() => expect(trigger()).toHaveFocus());
      expect(screen.queryByRole("menuitem")).not.toBeInTheDocument();
    });

    it("goes to the swing games page and closes on a click", async () => {
      const user = mount();
      await user.click(trigger());
      await user.click(
        await screen.findByRole("menuitem", { name: "Swing Games" }),
      );

      expect(await screen.findByTestId("landed")).toHaveTextContent(
        SWINGS_PATH,
      );
      expect(screen.queryByRole("menuitem")).not.toBeInTheDocument();
    });
  });

  describe("below wide-screen", () => {
    const realMatchMedia = window.matchMedia;
    beforeEach(() => {
      window.matchMedia = ((media: string) => ({
        media,
        matches: true,
        addEventListener: () => {},
        removeEventListener: () => {},
      })) as unknown as typeof window.matchMedia;
    });
    afterEach(() => {
      window.matchMedia = realMatchMedia;
    });

    async function openDrawer(options?: Parameters<typeof mount>[0]) {
      const user = mount(options);
      await user.click(trigger());
      return {
        user,
        drawer: await screen.findByRole("dialog", { name: "Menu" }),
      };
    }

    it("opens a drawer holding the week, Home and Swing Games", async () => {
      const { drawer } = await openDrawer();

      expect(
        within(drawer).getByText(`${SEASON} · Week ${WEEK}`),
      ).toBeVisible();
      expect(
        within(drawer)
          .getAllByRole("link")
          .map((link) => link.textContent),
      ).toEqual(["Home", "Swing Games"]);
      expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    });

    it("leaves the week out when there is none", async () => {
      const { drawer } = await openDrawer({ hasWeek: false });

      expect(within(drawer).queryByText(/Week/)).not.toBeInTheDocument();
    });

    it("marks the page it is on as current", async () => {
      const { drawer } = await openDrawer({ at: SWINGS_PATH });

      expect(
        within(drawer).getByRole("link", { name: "Swing Games" }),
      ).toHaveAttribute("aria-current", "page");
      expect(
        within(drawer).getByRole("link", { name: "Home" }),
      ).not.toHaveAttribute("aria-current");
    });

    it("moves focus into the drawer", async () => {
      const { drawer } = await openDrawer();

      await waitFor(() =>
        expect(drawer).toContainElement(document.activeElement as HTMLElement),
      );
    });

    it("goes to the swing games page and closes on a tap", async () => {
      const { user, drawer } = await openDrawer();

      await user.click(
        within(drawer).getByRole("link", { name: "Swing Games" }),
      );

      expect(await screen.findByTestId("landed")).toHaveTextContent(
        SWINGS_PATH,
      );
      await waitFor(() =>
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
      );
    });

    it("returns focus to the trigger on Escape", async () => {
      const { user } = await openDrawer();

      await user.keyboard("{Escape}");

      await waitFor(() =>
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
      );
      await waitFor(() => expect(trigger()).toHaveFocus());
    });
  });
});
