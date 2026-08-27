import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
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

describe("SettingsPage, the theme", () => {
  it("offers a light, a dark, and an auto", () => {
    mountPage();
    const themes = screen.getByRole("group", { name: "Theme" });

    expect(themes).toHaveTextContent("Light");
    expect(themes).toHaveTextContent("Dark");
    expect(themes).toHaveTextContent("Auto");
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
    await user.type(screen.getByLabelText("Your name"), "Linebacher");

    expect(localStorage.getItem(PLAYER_NAME_KEY)).toBe("Linebacher");
  });

  it("shows the name already saved", () => {
    localStorage.setItem(PLAYER_NAME_KEY, "Linebacher");
    mountPage();

    expect(screen.getByLabelText("Your name")).toHaveValue("Linebacher");
  });

  it("forgets the name once the field is cleared", async () => {
    localStorage.setItem(PLAYER_NAME_KEY, "Linebacher");
    const user = mountPage();
    await user.clear(screen.getByLabelText("Your name"));

    expect(localStorage.getItem(PLAYER_NAME_KEY)).toBeNull();
  });
});
