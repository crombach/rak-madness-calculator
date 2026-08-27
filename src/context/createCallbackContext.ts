import { createContext, useContext } from "react";
import doNothing from "../utils/doNothing";

/**
 * A context for a single callback, a no-op with no provider above so whatever
 * reads it can still be mounted on its own. `PlayerAnalysisContext` and
 * `GameStatusContext` are both this shape, threaded past a routed `Outlet`
 * that cannot be handed a prop on the way.
 */
export default function createCallbackContext<Arg extends string>() {
  const Context = createContext<(arg: Arg) => void>(doNothing);

  function useCallbackContext(): (arg: Arg) => void {
    return useContext(Context);
  }

  return [Context, useCallbackContext] as const;
}
