import { useMemo, useState } from "react";
import { isMyPlayer, useSettings } from "../../context/SettingsContext";
import { RakMadnessScores } from "../../types/RakMadnessScores";
import plural from "../../utils/plural";
import getHeadToHead, { Matchup } from "../../utils/scoring/headToHead";
import Button from "../button/Button";
import {
  PlayerOption,
  playerOptions,
} from "../playerAnalysis/PlayerAnalysisDialog";
import PlayerCombobox from "../playerAnalysis/PlayerCombobox";
import PicksTable from "../table/picks/PicksTable";
// For `analysis__standing` and `analysis__more`, which this page shares with the
// analysis dialog.
import "../playerAnalysis/AnalysisSummary.scss";
import { PICKER_LABELS } from "./HeadToHeadSkeleton";
import "./HeadToHead.scss";

function PlayerPicker({
  label,
  options,
  value,
  onValueChange,
}: {
  label: string;
  options: Array<PlayerOption>;
  value?: PlayerOption;
  onValueChange: (chosen: PlayerOption) => void;
}) {
  const [query, setQuery] = useState(value?.name ?? "");
  return (
    <div className="head-to-head__picker">
      <span className="head-to-head__label" aria-hidden="true">
        {label}
      </span>
      <PlayerCombobox
        ariaLabel={label}
        options={options}
        value={value}
        onValueChange={onValueChange}
        query={query}
        onQueryChange={setQuery}
      />
    </div>
  );
}

function standing({ leader, trailer, gap }: Matchup): string {
  if (gap === 0) return `${leader.name} and ${trailer.name} level on points`;
  return `${leader.name} leads ${trailer.name} by ${plural(gap, "point")}`;
}

function verdict({ leader, trailer, open, verdict }: Matchup): string {
  if (open.size === 0) return "No open game splits them";
  if (verdict.kind === "level") {
    return `${trailer.name} can draw level at best, so the tiebreakers decide`;
  }
  if (verdict.kind === "out") {
    return `${trailer.name} can no longer pass ${leader.name} on points`;
  }
  return `${trailer.name} needs ${verdict.needed} of ${plural(open.size, "open game")} to pass ${leader.name}`;
}

/** Two players' picks, cut to the games they picked differently, open ones first. */
export default function HeadToHead({ scores }: { scores?: RakMadnessScores }) {
  const { playerName } = useSettings();
  const options = useMemo(() => playerOptions(scores), [scores]);
  const [firstId, setFirstId] = useState(
    () => options.find((option) => isMyPlayer(option.name, playerName))?.id,
  );
  const [secondId, setSecondId] = useState<string>();
  // Each list leaves out the player the other holds, so the two never match.
  const firstOptions = useMemo(
    () => options.filter((option) => option.id !== secondId),
    [options, secondId],
  );
  const secondOptions = useMemo(
    () => options.filter((option) => option.id !== firstId),
    [options, firstId],
  );
  const first = scores?.scores.find((player) => player.id === firstId);
  const second = scores?.scores.find((player) => player.id === secondId);
  const players = useMemo(
    () => new Set([firstId, secondId].filter((id) => id != null)),
    [firstId, secondId],
  );
  const matchup = useMemo(
    () =>
      scores != null && first != null && second != null
        ? getHeadToHead(scores.scores, first, second)
        : undefined,
    [scores, first, second],
  );
  const [showsDecided, setShowsDecided] = useState(false);
  // Open games lead, since only they can still change the matchup. With none
  // left, the decided ones are all there is to show.
  const games = useMemo(() => {
    if (matchup == null) return undefined;
    const { open, decided } = matchup;
    if (open.size === 0 || showsDecided) return new Set([...open, ...decided]);
    return open;
  }, [matchup, showsDecided]);

  return (
    <>
      <div className="head-to-head">
        <div className="head-to-head__pickers">
          <PlayerPicker
            label={PICKER_LABELS[0]}
            options={firstOptions}
            value={firstOptions.find((option) => option.id === firstId)}
            onValueChange={(chosen) => setFirstId(chosen.id)}
          />
          <PlayerPicker
            label={PICKER_LABELS[1]}
            options={secondOptions}
            value={secondOptions.find((option) => option.id === secondId)}
            onValueChange={(chosen) => setSecondId(chosen.id)}
          />
        </div>
        <div role="status" className="head-to-head__standing">
          {matchup == null ? (
            <p className="analysis__standing">Pick two players to compare</p>
          ) : (
            <>
              <p className="analysis__standing">{standing(matchup)}</p>
              <p className="analysis__standing">{verdict(matchup)}</p>
            </>
          )}
        </div>
        {matchup != null &&
          matchup.open.size > 0 &&
          matchup.decided.size > 0 && (
            <Button
              className="analysis__more"
              variant="soft"
              size="sm"
              ariaExpanded={showsDecided}
              onClick={() => setShowsDecided(!showsDecided)}
            >
              {showsDecided ? "Show fewer" : "Show more"}
            </Button>
          )}
      </div>
      {first != null && second != null && games != null && games.size > 0 && (
        <PicksTable
          scores={scores}
          caption={`Picks where ${first.name} and ${second.name} differ`}
          players={players}
          games={games}
          showsTiebreakers
        />
      )}
    </>
  );
}
