import { stubXlsxCodepages } from "../../vite.config";

describe("stubXlsxCodepages", () => {
  it("swaps the codepage table for a module that exports undefined", () => {
    const plugin = stubXlsxCodepages();
    const resolveId = plugin.resolveId as (id: string) => string | undefined;
    const load = plugin.load as (id: string) => string | undefined;

    const stubId = resolveId("./cpexcel.js");
    expect(stubId).toBeDefined();
    const module: { exports: unknown } = { exports: {} };
    new Function("module", load(stubId as string) as string)(module);

    expect(module.exports).toBeUndefined();
  });
});
