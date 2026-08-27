import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { SettingsContextProvider } from "../../context/SettingsContext";
import SettingsDialog from "./SettingsDialog";

const THEME_KEY = "rak-madness:settings:theme";
const PLAYER_NAME_KEY = "rak-madness:settings:playerName";

function mountDialog(onOpenChange = () => undefined) {
  const user = userEvent.setup();
  render(
    <SettingsContextProvider>
      <SettingsDialog open onOpenChange={onOpenChange} />
    </SettingsContextProvider>,
  );
  return user;
}

beforeEach(() => {
  localStorage.clear();
  delete document.documentElement.dataset.theme;
});

describe("SettingsDialog", () => {
  it("asks for the name first, then the theme", () => {
    mountDialog();
    const headings = screen
      .getAllByRole("heading", { level: 3 })
      .map((heading) => heading.textContent);

    expect(headings).toEqual(["Your Player Name", "Theme"]);
  });

  it("closes from the shell's own close button", async () => {
    const onOpenChange = vi.fn();
    const user = mountDialog(onOpenChange);
    await user.click(screen.getByRole("button", { name: "Close" }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});

describe("SettingsDialog, the theme", () => {
  it("offers auto, dark, and light, in that order", () => {
    mountDialog();
    const labels = screen
      .getAllByRole("button")
      .filter((button) => button.classList.contains("settings__choice"))
      .map((button) => button.textContent);

    expect(labels).toEqual(["Auto", "Dark", "Light"]);
  });

  it("starts on auto", () => {
    mountDialog();

    expect(screen.getByRole("button", { name: "Auto" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("saves the theme that was clicked, and shows it as chosen", async () => {
    const user = mountDialog();
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

describe("SettingsDialog, the reader's own name", () => {
  it("saves what is typed", async () => {
    const user = mountDialog();
    await user.type(screen.getByLabelText("Your Player Name"), "Linebacher");

    expect(localStorage.getItem(PLAYER_NAME_KEY)).toBe("Linebacher");
  });

  it("shows the name already saved", () => {
    localStorage.setItem(PLAYER_NAME_KEY, "Linebacher");
    mountDialog();

    expect(screen.getByLabelText("Your Player Name")).toHaveValue("Linebacher");
  });

  it("forgets the name once the field is cleared", async () => {
    localStorage.setItem(PLAYER_NAME_KEY, "Linebacher");
    const user = mountDialog();
    await user.clear(screen.getByLabelText("Your Player Name"));

    expect(localStorage.getItem(PLAYER_NAME_KEY)).toBeNull();
  });

  it("empties the field from the clear button", async () => {
    localStorage.setItem(PLAYER_NAME_KEY, "Linebacher");
    const user = mountDialog();
    await user.click(
      screen.getByRole("button", { name: "Clear your player name" }),
    );

    expect(screen.getByLabelText("Your Player Name")).toHaveValue("");
    expect(localStorage.getItem(PLAYER_NAME_KEY)).toBeNull();
  });

  it("keeps the focus in the field it just emptied", async () => {
    localStorage.setItem(PLAYER_NAME_KEY, "Linebacher");
    const user = mountDialog();
    await user.click(
      screen.getByRole("button", { name: "Clear your player name" }),
    );

    // The button unmounts on the same click, so without this the focus lands on
    // `<body>` and the next tab restarts from the top of the document.
    expect(screen.getByLabelText("Your Player Name")).toHaveFocus();
  });

  it("offers nothing to clear while the field is empty", () => {
    mountDialog();

    expect(
      screen.queryByRole("button", { name: "Clear your player name" }),
    ).not.toBeInTheDocument();
  });
});
