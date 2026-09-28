import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import {
  EXPERIMENTAL_FEATURES_KEY,
  SettingsContextProvider,
} from "../../context/SettingsContext";
import LogoButton, { APP_NAME, BETA_WORD } from "./LogoButton";

beforeEach(() => {
  localStorage.clear();
});

describe("LogoButton", () => {
  it("calls onClick when pressed", async () => {
    const onClick = vi.fn();
    render(<LogoButton onClick={onClick} />);
    await userEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("keeps the unlit segments out of the accessible name", () => {
    render(<LogoButton onClick={() => undefined} />);
    expect(screen.getByRole("button")).toHaveAccessibleName(APP_NAME);
  });

  it("marks the name beta while experimental features are on", () => {
    localStorage.setItem(EXPERIMENTAL_FEATURES_KEY, "on");
    render(
      <SettingsContextProvider>
        <LogoButton onClick={() => undefined} />
      </SettingsContextProvider>,
    );
    expect(screen.getByRole("button")).toHaveAccessibleName(
      `${APP_NAME} ${BETA_WORD}`,
    );
  });
});
