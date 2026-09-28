import {
  PickResult,
  PlayerScore,
  RakMadnessScores,
  Status,
} from "../../types/RakMadnessScores";

/** A game still to be played unless a status says otherwise. */
export function pick(text: string, status: Status = "incomplete"): PickResult {
  return { pick: text, status, explanation: { header: "", message: "" } };
}

type PlayerOptions = {
  name: string;
  college?: Array<PickResult>;
  pro?: Array<PickResult>;
  total?: number;
  collegeScore?: number;
  proAgainstTheSpread?: number;
  tiebreakerPick?: number;
  distance?: number;
  isKnockedOut?: boolean;
};

export function player({
  name,
  college = [],
  pro = [],
  total = 0,
  collegeScore = 0,
  proAgainstTheSpread = 0,
  tiebreakerPick,
  distance,
  isKnockedOut = false,
}: PlayerOptions): PlayerScore {
  return {
    id: name,
    name,
    score: {
      total,
      college: collegeScore,
      pro: total - collegeScore,
      proAgainstTheSpread,
    },
    tiebreaker: { pick: tiebreakerPick, distance },
    college,
    pro,
    status: { hasNoPicks: false, isKnockedOut },
  };
}

export function week(
  players: Array<PlayerScore>,
  tiebreaker?: number,
): RakMadnessScores {
  return { tiebreaker, scores: players };
}
