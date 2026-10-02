import { loadGetKnockouts } from "../../context/AppDataContext";
import lazyPreloadable from "../../utils/lazyPreloadable";
import KnockoutsSkeleton from "./KnockoutsSkeleton";

// Lazy for the must-win search it reaches, which `ResultsFrame` keeps out of the
// chunk every route waits on. That search comes with it, so the page never
// mounts with nothing to draw.
export const knockoutsPage = lazyPreloadable(
  async () => {
    const [route] = await Promise.all([
      import("./KnockoutsRoute"),
      loadGetKnockouts(),
    ]);
    return route;
  },
  <KnockoutsSkeleton />,
);
