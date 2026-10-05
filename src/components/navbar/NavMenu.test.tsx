import { Mock } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";
import {
  useScores,
  useIsWeekSettled,
  useKnockouts,
} from "../../context/AppDataContext";
import {
  EXPERIMENTAL_FEATURES_KEY,
  SettingsContextProvider,
} from "../../context/SettingsContext";
import { KnockoutGame } from "../../utils/scoring/getKnockouts";
import { SETTINGS_SEEN_KEY } from "../settings/useSettingsSeen";
import { BETA_MARK, BETA_WORD } from "./LogoButton";
import NavMenu from "./NavMenu";

vi.mock("../../context/AppDataContext", () => ({
  useScores: vi.fn(),
  useIsWeekSettled: vi.fn(),
  useKnockouts: vi.fn(),
}));

const mockScores = useScores as Mock;
const mockIsWeekSettled = useIsWeekSettled as Mock;
const mockKnockouts = useKnockouts as Mock;
/** Enough players to compare, as `useScores()` holds them. */
const TWO_PLAYERS = { scores: [{}, {}] };
const A_KNOCKOUT_GAME = {} as KnockoutGame;

const SEASON = 2024;
const WEEK = 3;
const KNOCKOUTS_PATH = `/${SEASON}/${WEEK}/knockouts`;
const GAMES_PATH = `/${SEASON}/${WEEK}/games`;
const COMPARE_PATH = `/${SEASON}/${WEEK}/compare`;

/** Names the URL a click landed on, from the router's own history. */
function Landed() {
  return <span data-testid="landed">{useLocation().pathname}</span>;
}

function mount({
  pagesDisabled = false,
  hasWeek = true,
  at = "/",
}: {
  pagesDisabled?: boolean;
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
          pagesDisabled={pagesDisabled}
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

// Knockouts and Compare Players are experimental, so each ends in the β mark,
// which a screen reader hears as its word.
const KNOCKOUTS_NAME = `Knockouts ${BETA_WORD}`;
const KNOCKOUTS_TEXT = `Knockouts${BETA_MARK} ${BETA_WORD}`;
const COMPARE_PLAYERS_NAME = `Compare Players ${BETA_WORD}`;
const COMPARE_PLAYERS_TEXT = `Compare Players${BETA_MARK} ${BETA_WORD}`;

describe("NavMenu", () => {
  beforeEach(() => {
    localStorage.clear();
    // Knockouts and Compare Players show only with this opt-in.
    localStorage.setItem(EXPERIMENTAL_FEATURES_KEY, "on");
    mockIsWeekSettled.mockReturnValue(false);
    mockKnockouts.mockReturnValue({ games: [A_KNOCKOUT_GAME] });
    mockScores.mockReturnValue(TWO_PLAYERS);
  });

  it('names its trigger "Menu"', () => {
    mount();

    expect(trigger()).toBeInTheDocument();
  });

  describe("with a mouse", () => {
    it("lists Home, Games, Knockouts, Compare Players, then Settings", async () => {
      const user = mount();
      await user.click(trigger());

      const items = await screen.findAllByRole("menuitem");

      expect(items.map((item) => item.textContent)).toEqual([
        "Home",
        "Games",
        KNOCKOUTS_TEXT,
        COMPARE_PLAYERS_TEXT,
        "Settings",
      ]);
    });

    it("leaves out Knockouts and Compare Players with experimental features off", async () => {
      localStorage.removeItem(EXPERIMENTAL_FEATURES_KEY);
      const user = mount();
      await user.click(trigger());

      const items = await screen.findAllByRole("menuitem");

      expect(items.map((item) => item.textContent)).toEqual([
        "Home",
        "Games",
        "Settings",
      ]);
    });

    it("disables the pages but not Home or Settings when told to", async () => {
      const user = mount({ pagesDisabled: true });
      await user.click(trigger());

      const items = await screen.findAllByRole("menuitem");

      expect(
        items
          .filter((item) => !item.hasAttribute("data-disabled"))
          .map((item) => item.textContent),
      ).toEqual(["Home", "Settings"]);
    });

    it("gives the pages no reason when told to disable them", async () => {
      mockScores.mockReturnValue({ scores: [{}] });
      mockKnockouts.mockReturnValue({ games: [] });
      const user = mount({ pagesDisabled: true });
      await user.click(trigger());

      expect(
        await screen.findByRole("menuitem", { name: KNOCKOUTS_NAME }),
      ).not.toHaveAccessibleDescription();
    });

    it("opens the settings over the page and closes the menu", async () => {
      const user = mount();
      await user.click(trigger());

      await user.click(
        await screen.findByRole("menuitem", { name: "Settings" }),
      );

      expect(
        await screen.findByRole("dialog", { name: "Settings" }),
      ).toBeInTheDocument();
      await waitFor(() =>
        expect(screen.queryByRole("menu")).not.toBeInTheDocument(),
      );
    });

    it("pulses Settings at a reader who has never opened them", async () => {
      const user = mount();
      await user.click(trigger());

      expect(
        await screen.findByRole("menuitem", { name: "Settings" }),
      ).toHaveClass("nav-menu__settings--unseen");
    });

    it("stops pulsing as the settings open, and stamps the moment", async () => {
      const user = mount();
      await user.click(trigger());
      await user.click(
        await screen.findByRole("menuitem", { name: "Settings" }),
      );
      await screen.findByRole("dialog", { name: "Settings" });

      expect(
        Date.parse(localStorage.getItem(SETTINGS_SEEN_KEY) ?? ""),
      ).not.toBeNaN();
      await user.keyboard("{Escape}");
      await waitFor(() =>
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
      );
      await user.click(trigger());
      expect(
        await screen.findByRole("menuitem", { name: "Settings" }),
      ).not.toHaveClass("nav-menu__settings--unseen");
    });

    it("leaves Settings quiet for a reader who has opened them since", async () => {
      localStorage.setItem(SETTINGS_SEEN_KEY, new Date().toISOString());
      const user = mount();
      await user.click(trigger());

      expect(
        await screen.findByRole("menuitem", { name: "Settings" }),
      ).not.toHaveClass("nav-menu__settings--unseen");
    });

    it("pulses again at a reader whose last look predates the settings' own", async () => {
      localStorage.setItem(SETTINGS_SEEN_KEY, "2020-01-01T00:00:00.000Z");
      const user = mount();
      await user.click(trigger());

      expect(
        await screen.findByRole("menuitem", { name: "Settings" }),
      ).toHaveClass("nav-menu__settings--unseen");
    });

    it("treats a stamp it cannot read as never having looked", async () => {
      localStorage.setItem(SETTINGS_SEEN_KEY, "true");
      const user = mount();
      await user.click(trigger());

      expect(
        await screen.findByRole("menuitem", { name: "Settings" }),
      ).toHaveClass("nav-menu__settings--unseen");
    });

    it("marks the page it is on as current", async () => {
      const user = mount();
      await user.click(trigger());

      expect(
        await screen.findByRole("menuitem", { name: "Home" }),
      ).toHaveAttribute("aria-current", "page");
      expect(
        screen.getByRole("menuitem", { name: KNOCKOUTS_NAME }),
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
      await screen.findByRole("menuitem", { name: KNOCKOUTS_NAME });

      await user.keyboard("{Escape}");

      await waitFor(() => expect(trigger()).toHaveFocus());
      expect(screen.queryByRole("menuitem")).not.toBeInTheDocument();
    });

    it("goes to the knockouts page and closes on a click", async () => {
      const user = mount();
      await user.click(trigger());
      await user.click(
        await screen.findByRole("menuitem", { name: KNOCKOUTS_NAME }),
      );

      expect(await screen.findByTestId("landed")).toHaveTextContent(
        KNOCKOUTS_PATH,
      );
      expect(screen.queryByRole("menuitem")).not.toBeInTheDocument();
    });

    it("goes to the compare players page on a click", async () => {
      const user = mount();
      await user.click(trigger());
      await user.click(
        await screen.findByRole("menuitem", { name: COMPARE_PLAYERS_NAME }),
      );

      expect(await screen.findByTestId("landed")).toHaveTextContent(
        COMPARE_PATH,
      );
    });

    it("disables Compare Players with no reason while scores load", async () => {
      mockScores.mockReturnValue(undefined);
      const user = mount();
      await user.click(trigger());

      const item = await screen.findByRole("menuitem", {
        name: COMPARE_PLAYERS_NAME,
      });

      expect(item).toHaveAttribute("data-disabled");
      expect(item).toHaveAccessibleDescription("");
    });

    it("goes to the games page on a click", async () => {
      const user = mount();
      await user.click(trigger());
      await user.click(await screen.findByRole("menuitem", { name: "Games" }));

      expect(await screen.findByTestId("landed")).toHaveTextContent(GAMES_PATH);
    });

    it("disables Games while scores load, with no reason", async () => {
      mockScores.mockReturnValue(undefined);
      const user = mount();
      await user.click(trigger());

      const item = await screen.findByRole("menuitem", { name: "Games" });

      expect(item).toHaveAttribute("data-disabled");
      expect(item).toHaveAccessibleDescription("");
    });

    it("disables Knockouts on a complete week no game knocked anyone out of, with no reason", async () => {
      mockIsWeekSettled.mockReturnValue(true);
      mockKnockouts.mockReturnValue({ games: [] });
      const user = mount();
      await user.click(trigger());

      const item = await screen.findByRole("menuitem", { name: /Knockouts/ });
      expect(item).toHaveAttribute("data-disabled");
      expect(item).not.toHaveAccessibleDescription();
      expect(
        screen.getByRole("menuitem", { name: "Games" }),
      ).not.toHaveAttribute("data-disabled");
    });

    it("leaves Knockouts enabled on a complete week a game knocked someone out of", async () => {
      mockIsWeekSettled.mockReturnValue(true);
      const user = mount();
      await user.click(trigger());

      const item = await screen.findByRole("menuitem", {
        name: KNOCKOUTS_NAME,
      });

      expect(item).not.toHaveAttribute("data-disabled");
    });

    it("disables Knockouts while scores load", async () => {
      mockKnockouts.mockReturnValue(undefined);
      const user = mount();
      await user.click(trigger());

      const item = await screen.findByRole("menuitem", {
        name: /Knockouts/,
      });

      expect(item).toHaveAttribute("data-disabled");
      expect(item).not.toHaveAccessibleDescription();
    });

    it("disables Knockouts once no open game can knock anyone out", async () => {
      mockKnockouts.mockReturnValue({ games: [] });
      const user = mount();
      await user.click(trigger());

      const item = await screen.findByRole("menuitem", {
        name: /Knockouts/,
      });

      expect(item).toHaveAttribute("data-disabled");
    });

    it("shows the disabled reason under the item's name in the popup", async () => {
      mockKnockouts.mockReturnValue({ games: [] });
      const user = mount();
      await user.click(trigger());
      await screen.findByRole("menuitem", { name: /Knockouts/ });

      expect(screen.getByText("No game knocks anyone out")).toBeVisible();
      expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
    });

    it("names the disabled reason as the item's accessible description", async () => {
      mockKnockouts.mockReturnValue({ games: [] });
      const user = mount();
      await user.click(trigger());

      const item = await screen.findByRole("menuitem", {
        name: /Knockouts/,
      });

      expect(item).toHaveAccessibleDescription("No game knocks anyone out");
    });

    it("reaches the disabled item by keyboard", async () => {
      mockKnockouts.mockReturnValue({ games: [] });
      const user = mount();
      await user.click(trigger());
      const item = await screen.findByRole("menuitem", {
        name: /Knockouts/,
      });

      await user.keyboard("{ArrowDown}");
      await user.keyboard("{ArrowDown}");
      await user.keyboard("{ArrowDown}");

      await waitFor(() => expect(item).toHaveFocus());
    });

    it("leaves Knockouts enabled with a game open", async () => {
      const user = mount();
      await user.click(trigger());

      const item = await screen.findByRole("menuitem", {
        name: KNOCKOUTS_NAME,
      });

      expect(item).not.toHaveAttribute("data-disabled");
    });
  });

  describe("on a touch-only screen", () => {
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

    it("opens a drawer holding the menu pages, with no season or week combobox", async () => {
      const { drawer } = await openDrawer();

      expect(
        within(drawer)
          .getAllByRole("link")
          .map((link) => link.textContent),
      ).toEqual(["Home", "Games", KNOCKOUTS_TEXT, COMPARE_PLAYERS_TEXT]);
      expect(
        within(drawer).getByRole("button", { name: "Settings" }),
      ).toBeInTheDocument();
      expect(within(drawer).queryAllByRole("combobox")).toHaveLength(0);
      expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    });

    it("heads the drawer with its week, and still names it Menu", async () => {
      const { drawer } = await openDrawer();

      expect(drawer).toHaveAccessibleDescription(
        `${SEASON} Season • Week ${WEEK}`,
      );
    });

    it("heads the drawer with nothing when no week is chosen", async () => {
      const { drawer } = await openDrawer({ hasWeek: false });

      expect(drawer).not.toHaveAccessibleDescription();
    });

    it("disables Knockouts while scores load", async () => {
      mockKnockouts.mockReturnValue(undefined);
      const { drawer } = await openDrawer();

      expect(
        within(drawer).getByRole("link", { name: "Home" }),
      ).toHaveAttribute("href");
      const knockouts = within(drawer).getByRole("link", {
        name: KNOCKOUTS_NAME,
      });
      expect(knockouts).toHaveAttribute("aria-disabled", "true");
      expect(knockouts).not.toHaveAccessibleDescription();
    });

    it("shows the disabled reason under the item's name in the drawer", async () => {
      mockKnockouts.mockReturnValue({ games: [] });
      const { drawer } = await openDrawer();

      expect(
        within(drawer).getByText("No game knocks anyone out"),
      ).toBeVisible();
      expect(within(drawer).queryByRole("tooltip")).not.toBeInTheDocument();
    });

    it("names the disabled reason as the item's accessible description", async () => {
      mockKnockouts.mockReturnValue({ games: [] });
      const { drawer } = await openDrawer();

      expect(
        within(drawer).getByRole("link", { name: KNOCKOUTS_NAME }),
      ).toHaveAccessibleDescription("No game knocks anyone out");
    });

    it("leaves Knockouts enabled with a game open", async () => {
      const { drawer } = await openDrawer();

      expect(
        within(drawer).getByRole("link", { name: KNOCKOUTS_NAME }),
      ).toBeVisible();
    });

    it("marks the page it is on as current", async () => {
      const { drawer } = await openDrawer({ at: KNOCKOUTS_PATH });

      expect(
        within(drawer).getByRole("link", { name: KNOCKOUTS_NAME }),
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

    it("goes to the knockouts page and closes on a tap", async () => {
      const { user, drawer } = await openDrawer();

      await user.click(
        within(drawer).getByRole("link", { name: KNOCKOUTS_NAME }),
      );

      expect(await screen.findByTestId("landed")).toHaveTextContent(
        KNOCKOUTS_PATH,
      );
      await waitFor(() =>
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
      );
    });

    it("closes on a tap of the page it is on", async () => {
      const { user, drawer } = await openDrawer({ at: KNOCKOUTS_PATH });

      await user.click(
        within(drawer).getByRole("link", { name: KNOCKOUTS_NAME }),
      );

      await waitFor(() =>
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
      );
    });

    it("closes the drawer and opens the settings on a tap of Settings", async () => {
      const { user, drawer } = await openDrawer();

      await user.click(
        within(drawer).getByRole("button", { name: "Settings" }),
      );

      expect(
        await screen.findByRole("dialog", { name: "Settings" }),
      ).toBeInTheDocument();
      await waitFor(() =>
        expect(
          screen.queryByRole("dialog", { name: "Menu" }),
        ).not.toBeInTheDocument(),
      );
    });

    it("pulses Settings in the drawer at a reader who has never opened them", async () => {
      const { drawer } = await openDrawer();

      expect(
        within(drawer).getByRole("button", { name: "Settings" }),
      ).toHaveClass("nav-menu__settings--unseen");
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
