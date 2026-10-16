import { render, screen } from "@testing-library/react";
import {
  EXPERIMENTAL_FEATURES_KEY,
  SettingsContextProvider,
} from "../../context/SettingsContext";
import LogoButton, { APP_NAME, BETA_WORD } from "./LogoButton";

const offered = vi.hoisted(() => ({ value: false }));
vi.mock("../../context/experimentalFeaturesOffered", () => ({
  get EXPERIMENTAL_FEATURES_OFFERED() {
    return offered.value;
  },
}));

beforeEach(() => {
  localStorage.clear();
  offered.value = true;
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

  it("leaves the name plain while no feature is offered", () => {
    offered.value = false;
    localStorage.setItem(EXPERIMENTAL_FEATURES_KEY, "on");
    render(
      <SettingsContextProvider>
        <LogoButton onClick={() => undefined} />
      </SettingsContextProvider>,
    );
    expect(screen.getByRole("button")).toHaveAccessibleName(APP_NAME);
  });
});
