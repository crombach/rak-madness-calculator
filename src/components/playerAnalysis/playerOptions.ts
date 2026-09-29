import { RakMadnessScores } from "../../types/RakMadnessScores";
import repeatedNames from "../../utils/scoring/repeatedNames";

export type PlayerOption = {
  /** The row this entry is, since two of them can carry one name. */
  id: string;
  name: string;
  isKnockedOut: boolean;
  /** Whether another row of the week was entered under this same name. */
  hasNameConflict: boolean;
};

export function playerOptions(scores?: RakMadnessScores): Array<PlayerOption> {
  const players = scores?.scores ?? [];
  const repeated = repeatedNames(players);
  return players.map((player) => ({
    id: player.id,
    name: player.name,
    isKnockedOut: player.status.isKnockedOut,
    hasNameConflict: repeated.has(player.name),
  }));
}
