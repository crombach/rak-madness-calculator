import { MockedFunction } from "vitest";
import { getGameResult } from "./getLeagueResults";

/**
 * `getGameResult`, typed as the mock every test that polls a game asserts against.
 *
 * Each importer must still call `vi.mock` on `./getLeagueResults` itself, at its own
 * path from the importer. That call hoists above the importer's own top-level
 * imports, which is what keeps the real fetch from loading before the mock is in
 * place. A `vi.mock` call here would only hoist within this file.
 */
export const getGameResultMock = getGameResult as MockedFunction<
  typeof getGameResult
>;
