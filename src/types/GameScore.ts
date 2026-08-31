export type GameScore = {
  pointValue: number;
  explanation: {
    header: string;
    message: string;
    downDistanceText?: string;
  };
  /**
   * The pick cannot be scored either way: it is missing, its game is missing, or
   * the workbook contradicts itself about the game's spread. `explanation` says
   * which.
   */
  isUnscoreable: boolean;
  isFinal: boolean;
  hasSpread: boolean;
};
