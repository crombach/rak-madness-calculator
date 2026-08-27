import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { SettingsContextProvider } from "../../context/SettingsContext";
import SettingsPage from "./SettingsPage";

const THEME_KEY = "rak-madness:settings:theme";
const PLAYER_NAME_KEY = "rak-madness:settings:playerName";

function mountPage() {
  const user = userEvent.setup();
  render(
    <MemoryRouter>
      <SettingsContextProvider>
        <SettingsPage />
      </SettingsContextProvider>
    </MemoryRouter>,
  );
  return user;
}

beforeEach(() => {
  localStorage.clear();
  delete document.documentElement.dataset.theme;
});

describe("SettingsPage, the page itself", () => {
  it("names itself above the settings", () => {
    mountPage();

    expect(
      screen.getByRole("heading", { level: 2, name: "Settings" }),
    ).toBeInTheDocument();
  });

  it("leaves for the home page from the close button", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={["/settings"]}>
        <SettingsContextProvider>
          <Routes>
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/" element={<p>Home</p>} />
          </Routes>
        </SettingsContextProvider>
      </MemoryRouter>,
    );
    await user.click(screen.getByRole("button", { name: "Close settings" }));

    expect(screen.getByText("Home")).toBeInTheDocument();
  });
});

describe("SettingsPage, the theme", () => {
  it("offers auto, dark, and light, in that order", () => {
    mountPage();
    const labels = screen
      .getAllByRole("button")
      .filter((button) => button.classList.contains("settings__choice"))
      .map((button) => button.textContent);

    expect(labels).toEqual(["Auto", "Dark", "Light"]);
  });

  it("starts on auto", () => {
    mountPage();

    expect(screen.getByRole("button", { name: "Auto" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("saves the theme that was clicked, and shows it as chosen", async () => {
    const user = mountPage();
    await user.click(screen.getByRole("button", { name: "Dark" }));

    expect(screen.getByRole("button", { name: "Dark" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "Auto" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    expect(localStorage.getItem(THEME_KEY)).toBe("dark");
  });
});

describe("SettingsPage, the reader's own name", () => {
  it("saves what is typed", async () => {
    const user = mountPage();
    await user.type(screen.getByLabelText("Your Player Name"), "Linebacher");

    expect(localStorage.getItem(PLAYER_NAME_KEY)).toBe("Linebacher");
  });

  it("shows the name already saved", () => {
    localStorage.setItem(PLAYER_NAME_KEY, "Linebacher");
    mountPage();

    expect(screen.getByLabelText("Your Player Name")).toHaveValue("Linebacher");
  });

  it("forgets the name once the field is cleared", async () => {
    localStorage.setItem(PLAYER_NAME_KEY, "Linebacher");
    const user = mountPage();
    await user.clear(screen.getByLabelText("Your Player Name"));

    expect(localStorage.getItem(PLAYER_NAME_KEY)).toBeNull();
  });

  it("empties the field from the clear button", async () => {
    localStorage.setItem(PLAYER_NAME_KEY, "Linebacher");
    const user = mountPage();
    await user.click(
      screen.getByRole("button", { name: "Clear your player name" }),
    );

    expect(screen.getByLabelText("Your Player Name")).toHaveValue("");
    expect(localStorage.getItem(PLAYER_NAME_KEY)).toBeNull();
  });

  it("offers nothing to clear while the field is empty", () => {
    mountPage();

    expect(
      screen.queryByRole("button", { name: "Clear your player name" }),
    ).not.toBeInTheDocument();
  });
});
