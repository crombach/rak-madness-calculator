import { useMemo, useState } from "react";
import { isMyPlayer, useSettings } from "../../context/SettingsContext";
import { RakMadnessScores } from "../../types/RakMadnessScores";
import getClasses from "../../utils/getClasses";
import matching from "../../utils/matching";
import plural from "../../utils/plural";
import differingGames from "../../utils/scoring/differingGames";
import DialogCombobox from "../dialog/DialogCombobox";
import {
  PlayerOption,
  playerOptions,
} from "../playerAnalysis/PlayerAnalysisDialog";
import PicksTable from "../table/picks/PicksTable";
import PlayerStatusIcon from "../table/playerName/PlayerStatusIcon";
// For `analysis__standing`, which this page shares with the analysis dialog.
import "../playerAnalysis/AnalysisSummary.scss";
import "../playerAnalysis/PlayerAnalysisDialog.scss";
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
      <DialogCombobox<PlayerOption>
        ariaLabel={label}
        placeholder="Search players..."
        emptyMessage="No matching players"
        items={options}
        filteredItems={matching(options, query, (option) => option.name)}
        value={value}
        onValueChange={onValueChange}
        query={query}
        onQueryChange={setQuery}
        itemToStringLabel={(option) => option.name}
        itemKey={(option) => option.id}
        optionClassName={(option) =>
          getClasses("player-analysis__option", {
            "--knocked-out": option.isKnockedOut,
            "--name-conflict": option.hasNameConflict,
          })
        }
        renderOption={(option) => (
          <>
            <span className="player-analysis__option-name">{option.name}</span>
            <PlayerStatusIcon
              isKnockedOut={option.isKnockedOut}
              hasNameConflict={option.hasNameConflict}
            />
          </>
        )}
      />
    </div>
  );
}

/** Two players' picks, cut to the games they picked differently. */
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
  const games = useMemo(
    () =>
      first != null && second != null
        ? differingGames(first, second)
        : undefined,
    [first, second],
  );

  return (
    <>
      <div className="head-to-head">
        <div className="head-to-head__pickers">
          <PlayerPicker
            label="Player"
            options={firstOptions}
            value={firstOptions.find((option) => option.id === firstId)}
            onValueChange={(chosen) => setFirstId(chosen.id)}
          />
          <PlayerPicker
            label="Versus"
            options={secondOptions}
            value={secondOptions.find((option) => option.id === secondId)}
            onValueChange={(chosen) => setSecondId(chosen.id)}
          />
        </div>
        <p className="analysis__standing head-to-head__count" role="status">
          {games == null
            ? "Pick two players to compare"
            : `${plural(games.size, "game")} picked differently`}
        </p>
      </div>
      {first != null && second != null && games != null && games.size > 0 && (
        <PicksTable
          scores={scores}
          caption={`Picks where ${first.name} and ${second.name} differ`}
          players={players}
          games={games}
        />
      )}
    </>
  );
}
