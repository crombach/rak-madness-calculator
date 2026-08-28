import { PropsWithChildren } from "react";
import createCallbackContext from "./createCallbackContext";

/**
 * How anything under the results routes opens the game status on one game.
 */
const [GameStatusContext, useShowGameStatus] = createCallbackContext<string>();

export function GameStatusContextProvider({
  showGameStatus,
  children,
}: PropsWithChildren<{ showGameStatus: (gameLabel: string) => void }>) {
  return (
    <GameStatusContext.Provider value={showGameStatus}>
      {children}
    </GameStatusContext.Provider>
  );
}

export { useShowGameStatus };
