/** Why a pick reads the way it does, which a cell's tooltip and dialog show. */
export type PickExplanation = {
  header: string;
  message: string;
  downDistanceText?: string;
};

export type GameScore = {
  pointValue: number;
  explanation: PickExplanation;
  /**
   * The pick cannot be scored either way: it is missing, its game is missing, or
   * the workbook contradicts itself about the game's spread. `explanation` says
   * which.
   */
  isUnscoreable: boolean;
  isFinal: boolean;
  hasSpread: boolean;
};
