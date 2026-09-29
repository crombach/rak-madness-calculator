import { render, screen } from "@testing-library/react";
import {
  EXPERIMENTAL_FEATURES_KEY,
  SettingsContextProvider,
} from "../../context/SettingsContext";
import LogoButton, { APP_NAME, BETA_WORD } from "./LogoButton";

beforeEach(() => {
  localStorage.clear();
});

describe("LogoButton", () => {
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

  it("sets the beta mark beside the button, not inside it", () => {
    localStorage.setItem(EXPERIMENTAL_FEATURES_KEY, "on");
    render(
      <SettingsContextProvider>
        <LogoButton onClick={() => undefined} />
      </SettingsContextProvider>,
    );
    expect(screen.getByRole("button")).not.toContainElement(
      screen.getByText("β"),
    );
  });
});
