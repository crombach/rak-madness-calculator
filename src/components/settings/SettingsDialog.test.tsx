import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import {
  LIVE_ANALYSIS_KEY,
  PLAYER_NAME_KEY,
  SettingsContextProvider,
  THEME_KEY,
} from "../../context/SettingsContext";
import SettingsDialog from "./SettingsDialog";

function mountDialog(onOpenChange = () => undefined) {
  const user = userEvent.setup();
  render(
    <SettingsContextProvider>
      <SettingsDialog open onOpenChange={onOpenChange} />
    </SettingsContextProvider>,
  );
  return user;
}

/** The choices under one heading, which is what names their group. */
function choiceLabels(group: string): Array<string> {
  return screen
    .getAllByRole("button", { name: /.+/ })
    .filter(
      (button) =>
        button.classList.contains("settings__choice") &&
        screen.getByRole("group", { name: group }).contains(button),
    )
    .map((button) => button.textContent);
}

beforeEach(() => {
  localStorage.clear();
  delete document.documentElement.dataset.theme;
});

describe("SettingsDialog", () => {
  it("asks for the name first, then the analysis, then the theme", () => {
    mountDialog();
    const headings = screen
      .getAllByRole("heading", { level: 3 })
      .map((heading) => heading.textContent);

    expect(headings).toEqual(["Player Name", "Live Player Analysis", "Theme"]);
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

    expect(choiceLabels("Theme")).toEqual(["Auto", "Dark", "Light"]);
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
    await user.type(screen.getByLabelText("Player Name"), "Linebacher");

    expect(localStorage.getItem(PLAYER_NAME_KEY)).toBe("Linebacher");
  });

  it("shows the name already saved", () => {
    localStorage.setItem(PLAYER_NAME_KEY, "Linebacher");
    mountDialog();

    expect(screen.getByLabelText("Player Name")).toHaveValue("Linebacher");
  });

  it("forgets the name once the field is cleared", async () => {
    localStorage.setItem(PLAYER_NAME_KEY, "Linebacher");
    const user = mountDialog();
    await user.clear(screen.getByLabelText("Player Name"));

    expect(localStorage.getItem(PLAYER_NAME_KEY)).toBeNull();
  });

  it("empties the field from the clear button", async () => {
    localStorage.setItem(PLAYER_NAME_KEY, "Linebacher");
    const user = mountDialog();
    await user.click(
      screen.getByRole("button", { name: "Clear your player name" }),
    );

    expect(screen.getByLabelText("Player Name")).toHaveValue("");
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
    expect(screen.getByLabelText("Player Name")).toHaveFocus();
  });

  it("leaves the field on enter, which drops a phone's keyboard", async () => {
    const user = mountDialog();
    const field = screen.getByLabelText("Player Name");
    await user.type(field, "Linebacher{Enter}");

    expect(field).not.toHaveFocus();
    expect(field).toHaveValue("Linebacher");
  });

  it("offers nothing to clear while the field is empty", () => {
    mountDialog();

    expect(
      screen.queryByRole("button", { name: "Clear your player name" }),
    ).not.toBeInTheDocument();
  });
});

describe("SettingsDialog, the live player analysis", () => {
  it("offers enable then disable", () => {
    mountDialog();

    expect(choiceLabels("Live Player Analysis")).toEqual(["Enable", "Disable"]);
  });

  it("starts enabled", () => {
    mountDialog();

    expect(screen.getByRole("button", { name: "Enable" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("saves the choice to disable, and shows it as chosen", async () => {
    const user = mountDialog();
    await user.click(screen.getByRole("button", { name: "Disable" }));

    expect(screen.getByRole("button", { name: "Disable" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(localStorage.getItem(LIVE_ANALYSIS_KEY)).toBe("off");
  });

  it("forgets the choice on the way back to enabled, the default", async () => {
    const user = mountDialog();
    await user.click(screen.getByRole("button", { name: "Disable" }));
    await user.click(screen.getByRole("button", { name: "Enable" }));

    expect(localStorage.getItem(LIVE_ANALYSIS_KEY)).toBeNull();
  });

  it("starts on the choice last made", () => {
    localStorage.setItem(LIVE_ANALYSIS_KEY, "off");
    mountDialog();

    expect(screen.getByRole("button", { name: "Disable" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });
});
