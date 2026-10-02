import { useEffect, useMemo, useState } from "react";
import useArrival from "../../hooks/useArrival";
import { PlayerAnalysis } from "../../types/PlayerAnalysis";
import { RakMadnessScores } from "../../types/RakMadnessScores";
import repeatedNames from "../../utils/scoring/repeatedNames";
import weekShape from "../../utils/scoring/weekShape";
import getPlayerAnalysis, {
  getSettledAnalysis,
} from "../../utils/scoring/getPlayerAnalysis";
import DialogShell from "../dialog/DialogShell";
import AnalysisSummary from "./AnalysisSummary";
import PlayerCombobox from "./PlayerCombobox";
import { PlayerOption, playerOptions } from "./playerOptions";
import "./PlayerAnalysisDialog.scss";

/**
 * Where a player stands in the week on screen, and what they still have to do to
 * win it.
 */
export default function PlayerAnalysisDialog({
  open,
  onOpenChange,
  player: named,
  scores,
  weekNumber,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Set where the dialog was opened on one player, by clicking their name. */
  player?: string;
  scores?: RakMadnessScores;
  /** Which week the scores are for, which a won week is named by. */
  weekNumber?: number;
}) {
  const [player, setPlayer] = useState<PlayerOption>();
  const [query, setQuery] = useState("");
  const [found, setFound] = useState<{
    scores: RakMadnessScores;
    name: string;
    paths?: PlayerAnalysis;
  }>();

  // Held still between renders, since the combobox reads the chosen player back
  // off this list by identity.
  const options = useMemo(() => playerOptions(scores), [scores]);
  // Once per scoring pass, not once per keystroke in the search. Reading it walks
  // every pick of every player.
  const shape = useMemo(() => weekShape(scores?.scores ?? []), [scores]);
  // Everything below reads a player out of the week by name, so a name two rows
  // share has no one answer. Said outright rather than answered for whichever row
  // came first.
  const repeated = useMemo(() => repeatedNames(scores?.scores ?? []), [scores]);
  const hasNameConflict = player != null && repeated.has(player.name);

  // A name arriving from outside stands in for a choice made in the search.
  useArrival(named, (name) => {
    setPlayer(options.find((option) => option.name === name));
    setQuery(name);
  });

  // The answers the week already holds: a knocked out player, and a week the
  // knockouts have settled. Both are a walk of the players, so they are read here
  // rather than waited for below. That keeps the dialog's height steady while the
  // search runs.
  const settled = useMemo(() => {
    if (scores == null || player == null || repeated.has(player.name))
      return undefined;
    const paths = getSettledAnalysis(scores, player.name);
    return paths == null ? undefined : { scores, name: player.name, paths };
  }, [scores, player, repeated]);

  // The search is thousands of scenarios and holds the thread while it runs, so
  // it waits for the bar that says so to paint first.
  useEffect(() => {
    if (scores == null || player == null || settled != null) return;
    if (repeated.has(player.name)) return;
    let timer = 0;
    const frame = requestAnimationFrame(() => {
      timer = window.setTimeout(() =>
        setFound({
          scores,
          name: player.name,
          paths: getPlayerAnalysis(scores, player.name),
        }),
      );
    });
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
  }, [scores, player, settled, repeated]);

  // The answer on screen stays until the next lands, so switching players swaps one
  // for another rather than emptying and refilling. Only a rescore clears it.
  const searched = found?.scores === scores ? found : undefined;
  const shown = settled ?? searched;
  const isAnalysisLoading =
    player != null && !hasNameConflict && shown?.name !== player.name;

  return (
    <DialogShell
      open={open}
      onOpenChange={onOpenChange}
      title="Player Analysis"
      busy={isAnalysisLoading && { label: "Working out the paths" }}
      search={
        <PlayerCombobox
          ariaLabel="Player"
          options={options}
          value={player}
          onValueChange={setPlayer}
          query={query}
          onQueryChange={setQuery}
        />
      }
    >
      <AnalysisSummary
        scores={scores}
        playerName={player?.name}
        result={shown?.paths}
        shape={shape}
        weekNumber={weekNumber}
        hasNameConflict={hasNameConflict}
      />
    </DialogShell>
  );
}
