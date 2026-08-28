import { useEffect, useMemo, useState } from "react";
import useArrival from "../../hooks/useArrival";
import { PlayerAnalysis } from "../../types/PlayerAnalysis";
import { RakMadnessScores } from "../../types/RakMadnessScores";
import getClasses from "../../utils/getClasses";
import matching from "../../utils/matching";
import weekShape from "../../utils/scoring/weekShape";
import getPlayerAnalysis, {
  getSettledAnalysis,
} from "../../utils/scoring/getPlayerAnalysis";
import DialogCombobox from "../dialog/DialogCombobox";
import DialogShell from "../dialog/DialogShell";
import PlayerStatusIcon from "../table/playerName/PlayerStatusIcon";
import AnalysisSummary from "./AnalysisSummary";
import "./PlayerAnalysisDialog.scss";

export type PlayerOption = { name: string; isKnockedOut: boolean };

export function playerOptions(scores?: RakMadnessScores): Array<PlayerOption> {
  return (
    scores?.scores.map((player) => ({
      name: player.name,
      isKnockedOut: player.status.isKnockedOut,
    })) ?? []
  );
}

/**
 * Where a player stands in the week on screen, and what they still have to do to
 * win it.
 */
export default function PlayerAnalysisDialog({
  open,
  onOpenChange,
  player: named,
  scores,
  week,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Set where the dialog was opened on one player, by clicking their name. */
  player?: string;
  scores?: RakMadnessScores;
  /** Which week the scores are for, which a won week is named by. */
  week?: number;
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

  // A name arriving from outside stands in for a choice made in the search.
  useArrival(named, (name) => {
    setPlayer(options.find((option) => option.name === name));
    setQuery(name);
  });

  // The answers the week already holds: a knocked out player, and a week the
  // knockouts have settled. Both are a walk of the players, so they are read here
  // rather than waited for below, where the bar used to stand over an answer that
  // was ready and then grow the dialog under it.
  const settled = useMemo(() => {
    if (scores == null || player == null) return undefined;
    const paths = getSettledAnalysis(scores, player.name);
    return paths == null ? undefined : { scores, name: player.name, paths };
  }, [scores, player]);

  // The search is thousands of scenarios and holds the thread while it runs, so
  // it waits for the bar that says so to paint first.
  useEffect(() => {
    if (scores == null || player == null || settled != null) return;
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
  }, [scores, player, settled]);

  // The answer already on screen stays there while the next one is worked out, so
  // moving between players reads as one answer replacing another rather than as the
  // dialog emptying and filling again. Only a rescore takes it away.
  const searched = found?.scores === scores ? found : undefined;
  const shown = settled ?? searched;
  const isSearching = player != null && shown?.name !== player.name;

  return (
    <DialogShell
      open={open}
      onOpenChange={onOpenChange}
      title="Player Analysis"
      busy={isSearching && { label: "Working out the paths" }}
      search={
        <DialogCombobox<PlayerOption>
          ariaLabel="Player"
          placeholder="Search players..."
          emptyMessage="No matching players"
          items={options}
          filteredItems={matching(options, query, (option) => option.name)}
          value={player}
          onValueChange={setPlayer}
          query={query}
          onQueryChange={setQuery}
          itemToStringLabel={(option) => option.name}
          itemKey={(option) => option.name}
          optionClassName={(option) =>
            getClasses("player-analysis__option", {
              "--knocked-out": option.isKnockedOut,
            })
          }
          // The player named in the input is marked the way the tables mark them,
          // so the search says where they stand before the answer below it has
          // been worked out.
          adornment={
            player != null && (
              <span
                className={getClasses("player-analysis__input-status", {
                  "--knocked-out": player.isKnockedOut,
                })}
              >
                <PlayerStatusIcon isKnockedOut={player.isKnockedOut} />
              </span>
            )
          }
          // An entry carries the status icon the tables give the same player, in
          // the hue they fill that player's cell with.
          renderOption={(option) => (
            <>
              <span className="player-analysis__option-name">
                {option.name}
              </span>
              <PlayerStatusIcon isKnockedOut={option.isKnockedOut} />
            </>
          )}
        />
      }
    >
      <AnalysisSummary
        scores={scores}
        player={player?.name}
        result={shown?.paths}
        shape={shape}
        weekNumber={week}
      />
    </DialogShell>
  );
}
