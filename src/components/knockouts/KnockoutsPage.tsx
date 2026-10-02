import { loadGetKnockouts } from "../../context/AppDataContext";
import doNothing from "../../utils/doNothing";
import lazyPreloadable from "../../utils/lazyPreloadable";
import KnockoutsSkeleton from "./KnockoutsSkeleton";

// Lazy for the must-win search it reaches, which `ResultsFrame` keeps out of the
// chunk every route waits on. That search comes with it, so the page never
// mounts with nothing to draw. A failed download of it still mounts the page,
// since `lazy` keeps a failure for good, and `useKnockouts` asks again on a poll.
export const knockoutsPage = lazyPreloadable(
  async () => {
    const [route] = await Promise.all([
      import("./KnockoutsRoute"),
      loadGetKnockouts().catch(doNothing),
    ]);
    return route;
  },
  <KnockoutsSkeleton />,
);
