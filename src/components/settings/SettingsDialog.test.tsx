import { render, screen, within } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import {
  EXPERIMENTAL_FEATURES_KEY,
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
  const row = screen.getByRole("group", { name: group });
  return screen
    .getAllByRole("button", { name: /.+/ })
    .filter(
      (button) =>
        button.classList.contains("settings__choice") && row.contains(button),
    )
    .map((button) => button.textContent);
}

/** One choice under one heading, since more than one row offers On and Off. */
function choice(group: string, label: string): HTMLElement {
  return within(screen.getByRole("group", { name: group })).getByRole(
    "button",
    { name: label },
  );
}

beforeEach(() => {
  localStorage.clear();
  delete document.documentElement.dataset.theme;
});

describe("SettingsDialog", () => {
  it("asks for the name, the analysis, the theme, then the experiments", () => {
    mountDialog();
    const headings = screen
      .getAllByRole("heading", { level: 3 })
      .map((heading) => heading.textContent);

    expect(headings).toEqual([
      "Player Name",
      "Live Player Analysis",
      "Theme",
      "βeta Mode",
    ]);
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
  it("offers on then off", () => {
    mountDialog();

    expect(choiceLabels("Live Player Analysis")).toEqual(["On", "Off"]);
  });

  it("starts on", () => {
    mountDialog();

    expect(choice("Live Player Analysis", "On")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("saves the choice to disable, and shows it as chosen", async () => {
    const user = mountDialog();
    await user.click(choice("Live Player Analysis", "Off"));

    expect(choice("Live Player Analysis", "Off")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(localStorage.getItem(LIVE_ANALYSIS_KEY)).toBe("off");
  });

  it("forgets the choice on the way back to enabled, the default", async () => {
    const user = mountDialog();
    await user.click(choice("Live Player Analysis", "Off"));
    await user.click(choice("Live Player Analysis", "On"));

    expect(localStorage.getItem(LIVE_ANALYSIS_KEY)).toBeNull();
  });

  it("starts on the choice last made", () => {
    localStorage.setItem(LIVE_ANALYSIS_KEY, "off");
    mountDialog();

    expect(choice("Live Player Analysis", "Off")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });
});

describe("SettingsDialog, the experimental features", () => {
  it("offers on then off, and starts off", () => {
    mountDialog();

    expect(choiceLabels("βeta Mode")).toEqual(["On", "Off"]);
    expect(choice("βeta Mode", "Off")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("saves the opt-in, and forgets it on the way back out", async () => {
    const user = mountDialog();
    await user.click(choice("βeta Mode", "On"));

    expect(choice("βeta Mode", "On")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(localStorage.getItem(EXPERIMENTAL_FEATURES_KEY)).toBe("on");

    await user.click(choice("βeta Mode", "Off"));

    expect(choice("βeta Mode", "Off")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(localStorage.getItem(EXPERIMENTAL_FEATURES_KEY)).toBeNull();
  });
});
