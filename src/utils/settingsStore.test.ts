import { readSetting, writeSetting } from "./settingsStore";
import { storageContractSuite } from "./storageMockUtils";

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe("settingsStore", () => {
  it("reads back what it wrote", () => {
    writeSetting("playerName", "Linebacher");

    expect(readSetting("playerName")).toBe("Linebacher");
  });

  it("has nothing for a name never set", () => {
    expect(readSetting("theme")).toBeUndefined();
  });

  it("forgets a setting written empty", () => {
    writeSetting("playerName", "Linebacher");
    writeSetting("playerName", "");

    expect(readSetting("playerName")).toBeUndefined();
  });

  it("leaves the settings beside the one it writes", () => {
    writeSetting("theme", "dark");
    writeSetting("playerName", "");

    expect(readSetting("theme")).toBe("dark");
  });

  storageContractSuite(
    () => readSetting("theme"),
    () => writeSetting("theme", "dark"),
  );
});
