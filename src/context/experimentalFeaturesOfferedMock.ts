/**
 * Stands in for `experimentalFeaturesOffered` in a test, false like the real one:
 * `vi.mock("…/experimentalFeaturesOffered", () => import("…/experimentalFeaturesOfferedMock"))`.
 */
export let EXPERIMENTAL_FEATURES_OFFERED = false;

export function setExperimentalFeaturesOffered(offered: boolean) {
  EXPERIMENTAL_FEATURES_OFFERED = offered;
}
