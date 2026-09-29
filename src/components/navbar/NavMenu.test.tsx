import { Mock } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";
import { useIsWeekWon, useSwingGames } from "../../context/AppDataContext";
import {
  EXPERIMENTAL_FEATURES_KEY,
  SettingsContextProvider,
} from "../../context/SettingsContext";
import { SwingGame } from "../../utils/scoring/getSwingGames";
import NavMenu from "./NavMenu";

vi.mock("../../context/AppDataContext", () => ({
  useIsWeekWon: vi.fn(),
  useSwingGames: vi.fn(),
}));

const mockIsWeekWon = useIsWeekWon as Mock;
const mockSwingGames = useSwingGames as Mock;
const A_SWING_GAME = {} as SwingGame;

const SEASON = 2024;
const WEEK = 3;
const SWINGS_PATH = `/${SEASON}/${WEEK}/swings`;

/** Names the URL a click landed on, from the router's own history. */
function Landed() {
  return <span data-testid="landed">{useLocation().pathname}</span>;
}

function mount({
  disabled = false,
  hasWeek = true,
  at = "/",
}: {
  disabled?: boolean;
  hasWeek?: boolean;
  at?: string;
} = {}) {
  const user = userEvent.setup();
  render(
    <MemoryRouter initialEntries={[at]}>
      <SettingsContextProvider>
        <NavMenu
          season={SEASON}
          week={hasWeek ? WEEK : undefined}
          disabled={disabled}
        />
      </SettingsContextProvider>
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
  beforeEach(() => {
    // Swing Games gates on this opt-in too, beside `isWeekWon`.
    localStorage.setItem(EXPERIMENTAL_FEATURES_KEY, "on");
    mockIsWeekWon.mockReturnValue(false);
    mockSwingGames.mockReturnValue({ games: [A_SWING_GAME] });
  });

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

    it("disables Swing Games once the week has a winner", async () => {
      mockIsWeekWon.mockReturnValue(true);
      const user = mount();
      await user.click(trigger());

      const item = await screen.findByRole("menuitem", {
        name: /Swing Games/,
      });

      expect(item).toHaveAttribute("data-disabled");
      expect(item).toHaveAccessibleDescription("Week already won");
    });

    it("shows no menu with experimental features off", () => {
      localStorage.removeItem(EXPERIMENTAL_FEATURES_KEY);
      mount();

      expect(
        screen.queryByRole("button", { name: "Menu" }),
      ).not.toBeInTheDocument();
    });

    it("disables Swing Games while scores load", async () => {
      mockSwingGames.mockReturnValue(undefined);
      const user = mount();
      await user.click(trigger());

      const item = await screen.findByRole("menuitem", {
        name: /Swing Games/,
      });

      expect(item).toHaveAttribute("data-disabled");
      expect(item).toHaveAccessibleDescription("Scores still loading");
    });

    it("disables Swing Games once no open game can knock anyone out", async () => {
      mockSwingGames.mockReturnValue({ games: [] });
      const user = mount();
      await user.click(trigger());

      const item = await screen.findByRole("menuitem", {
        name: /Swing Games/,
      });

      expect(item).toHaveAttribute("data-disabled");
    });

    it("keeps the disabled reason out of sight in the popup", async () => {
      mockSwingGames.mockReturnValue({ games: [] });
      const user = mount();
      await user.click(trigger());
      await screen.findByRole("menuitem", { name: /Swing Games/ });

      expect(screen.getByText("No game knocks anyone out")).toHaveClass(
        "nav-menu__sr-only",
      );
    });

    it("names the disabled reason as the item's accessible description", async () => {
      mockSwingGames.mockReturnValue({ games: [] });
      const user = mount();
      await user.click(trigger());

      const item = await screen.findByRole("menuitem", {
        name: /Swing Games/,
      });

      expect(item).toHaveAccessibleDescription("No game knocks anyone out");
    });

    it("shows the disabled reason in a tooltip on hover", async () => {
      mockSwingGames.mockReturnValue({ games: [] });
      const user = mount();
      await user.click(trigger());
      const item = await screen.findByRole("menuitem", {
        name: /Swing Games/,
      });

      await user.hover(item);

      expect(await screen.findByRole("tooltip")).toHaveTextContent(
        "No game knocks anyone out",
      );
    });

    it("shows the disabled reason in a tooltip on keyboard focus", async () => {
      mockSwingGames.mockReturnValue({ games: [] });
      const user = mount();
      await user.click(trigger());
      const item = await screen.findByRole("menuitem", {
        name: /Swing Games/,
      });

      await user.keyboard("{ArrowDown}");
      await user.keyboard("{ArrowDown}");

      await waitFor(() => expect(item).toHaveFocus());
      expect(await screen.findByRole("tooltip")).toHaveTextContent(
        "No game knocks anyone out",
      );
    });

    it("leaves Swing Games enabled with a game open", async () => {
      const user = mount();
      await user.click(trigger());

      const item = await screen.findByRole("menuitem", {
        name: "Swing Games",
      });

      expect(item).not.toHaveAttribute("data-disabled");
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

    it("opens a drawer holding Home and Swing Games, with no season or week combobox", async () => {
      const { drawer } = await openDrawer();

      expect(
        within(drawer)
          .getAllByRole("link")
          .map((link) => link.textContent),
      ).toEqual(["Home", "Swing Games"]);
      expect(within(drawer).queryAllByRole("combobox")).toHaveLength(0);
      expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    });

    it("disables Swing Games while scores load", async () => {
      mockSwingGames.mockReturnValue(undefined);
      const { drawer } = await openDrawer();

      expect(
        within(drawer).getByRole("link", { name: "Home" }),
      ).toHaveAttribute("href");
      expect(
        within(drawer).getByRole("link", { name: "Swing Games" }),
      ).toHaveAttribute("aria-disabled", "true");
    });

    it("keeps the disabled reason out of sight in the drawer", async () => {
      mockSwingGames.mockReturnValue({ games: [] });
      const { drawer } = await openDrawer();

      expect(within(drawer).getByText("No game knocks anyone out")).toHaveClass(
        "nav-menu__sr-only",
      );
    });

    it("names the disabled reason as the item's accessible description", async () => {
      mockSwingGames.mockReturnValue({ games: [] });
      const { drawer } = await openDrawer();

      expect(
        within(drawer).getByText(/Swing Games/),
      ).toHaveAccessibleDescription("No game knocks anyone out");
    });

    it("leaves Swing Games enabled with a game open", async () => {
      const { drawer } = await openDrawer();

      expect(
        within(drawer).getByRole("link", { name: "Swing Games" }),
      ).toBeVisible();
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
