import { useEffect, useMemo, useState } from "react";
import { useScores } from "../context/AppDataContext";
import { isMyPlayer, useSetting } from "../context/SettingsContext";
import { RakMadnessScores } from "../types/RakMadnessScores";
import cachedImport from "../utils/cachedImport";

type GetMustWin =
  typeof import("../utils/scoring/getPlayerAnalysis").getMustWin;

const NO_LABELS: ReadonlySet<string> = new Set();

/**
 * Loaded on first use, in the chunk `getKnockouts` loads, so the routes do not
 * carry `getPlayerAnalysis` in the chunk every one of them waits on.
 */
const loadGetMustWin = cachedImport(() =>
  import("../utils/scoring/getPlayerAnalysis").then(
    ({ getMustWin }) => getMustWin,
  ),
);

/** One read per scores and player, shared by every caller, as it costs a verdict per game. */
const cache = new WeakMap<RakMadnessScores, Map<string, ReadonlySet<string>>>();

function labelsFor(
  getMustWin: GetMustWin,
  scores: RakMadnessScores,
  name: string,
): ReadonlySet<string> {
  let byName = cache.get(scores);
  if (byName == null) cache.set(scores, (byName = new Map()));
  let labels = byName.get(name);
  if (labels == null) {
    labels = new Set(getMustWin(scores, name).games.map(({ label }) => label));
    byName.set(name, labels);
  }
  return labels;
}

/**
 * The labels of the games the reader's own player must win, as Player Analysis
 * names them. Empty with no name set, no scores yet, no player by the name, or
 * the chunk not loaded yet.
 */
export default function useMyMustWinLabels(): ReadonlySet<string> {
  const playerName = useSetting("playerName");
  const scores = useScores();
  const [getMustWin, setGetMustWin] = useState<GetMustWin>();
  const player = scores?.scores.find(({ name }) =>
    isMyPlayer(name, playerName),
  );
  const name = player?.name;

  useEffect(() => {
    if (name == null || getMustWin != null) return;
    let isCurrent = true;
    loadGetMustWin().then(
      (loaded) => {
        if (isCurrent) setGetMustWin(() => loaded);
      },
      (error) => console.warn("Could not load the must-win games", error),
    );
    return () => {
      isCurrent = false;
    };
  }, [name, getMustWin]);

  return useMemo(() => {
    if (scores == null || name == null || getMustWin == null) return NO_LABELS;
    return labelsFor(getMustWin, scores, name);
  }, [scores, name, getMustWin]);
}
