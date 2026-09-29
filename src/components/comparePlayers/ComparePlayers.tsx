import { useEffect, useId, useMemo, useState } from "react";
import { isMyPlayer, useSettings } from "../../context/SettingsContext";
import { PlayerScore, RakMadnessScores } from "../../types/RakMadnessScores";
import getComparison from "../../utils/scoring/comparePlayers";
import Button from "../button/Button";
import { CloseIcon } from "../icon/Icon";
import {
  PlayerOption,
  playerOptions,
} from "../playerAnalysis/PlayerAnalysisDialog";
import PlayerCombobox from "../playerAnalysis/PlayerCombobox";
import PicksTable from "../table/picks/PicksTable";
import {
  MAX_PICKERS,
  MIN_PICKERS,
  pickerLabel,
  readComparedPlayers,
  writeComparedPlayers,
} from "./comparedPlayers";
import { AddButton } from "./ComparePlayersSkeleton";
// For `analysis__standing` and `analysis__more`, which this page shares with the
// analysis dialog.
import "../playerAnalysis/AnalysisSummary.scss";
import "./ComparePlayers.scss";

const NAMES = new Intl.ListFormat("en", { type: "conjunction" });

/** The table's two scopes, by whether it shows every game. */
const GAME_SCOPES = [
  { showsAll: false, label: "Diff" },
  { showsAll: true, label: "All" },
] as const;

/** One picker. `key` stays with it when an earlier one is removed. */
type Slot = { key: number; id?: string };

let slotCount = 0;

function newSlot(id?: string): Slot {
  return { key: slotCount++, id };
}

function PlayerPicker({
  label,
  options,
  value,
  onValueChange,
  onRemove,
}: {
  label: string;
  options: Array<PlayerOption>;
  value?: PlayerOption;
  onValueChange: (chosen: PlayerOption) => void;
  /** Absent while the page holds no more pickers than it opens with. */
  onRemove?: () => void;
}) {
  const [query, setQuery] = useState(value?.name ?? "");
  return (
    <div className="compare-players__picker">
      <span className="compare-players__label" aria-hidden="true">
        {label}
      </span>
      <div className="compare-players__field">
        <PlayerCombobox
          ariaLabel={label}
          options={options}
          value={value}
          onValueChange={onValueChange}
          query={query}
          onQueryChange={setQuery}
        />
        {onRemove != null && (
          <Button
            variant="soft"
            iconOnly
            ariaLabel={`Remove ${label}`}
            onClick={onRemove}
          >
            <CloseIcon />
          </Button>
        )}
      </div>
    </div>
  );
}

/**
 * The rows the saved names still name this week, one row per name. Falls back to
 * the reader's own row alone when none of them does.
 */
function startingIds(
  players: Array<PlayerScore>,
  myName: string,
): Array<string | undefined> {
  const ids: Array<string> = [];
  for (const name of readComparedPlayers()) {
    const row = players.find(
      (player) => player.name === name && !ids.includes(player.id),
    );
    if (row != null) ids.push(row.id);
  }
  if (ids.length === 0) {
    const mine = players.find((player) => isMyPlayer(player.name, myName));
    if (mine != null) ids.push(mine.id);
  }
  return [
    ...ids,
    ...Array(Math.max(MIN_PICKERS - ids.length, 0)).fill(undefined),
  ];
}

/** Two or more players' picks, cut to the games they split, open ones first. */
export default function ComparePlayers({
  scores,
}: {
  scores?: RakMadnessScores;
}) {
  const { playerName } = useSettings();
  const options = useMemo(() => playerOptions(scores), [scores]);
  const [slots, setSlots] = useState(() =>
    startingIds(scores?.scores ?? [], playerName).map(newSlot),
  );
  const chosen = useMemo(
    () =>
      slots.flatMap(
        ({ id }) => scores?.scores.find((player) => player.id === id) ?? [],
      ),
    [slots, scores],
  );

  useEffect(() => {
    writeComparedPlayers(chosen.map((player) => player.name));
  }, [chosen]);

  const choose = (key: number, id: string) =>
    setSlots(slots.map((slot) => (slot.key === key ? { key, id } : slot)));
  const add = () => setSlots([...slots, newSlot()]);
  const remove = (key: number) =>
    setSlots(slots.filter((slot) => slot.key !== key));

  const players = useMemo(
    () => new Set(chosen.map((player) => player.id)),
    [chosen],
  );
  const comparison = useMemo(
    () =>
      scores != null && chosen.length >= MIN_PICKERS
        ? getComparison(scores.scores, chosen)
        : undefined,
    [scores, chosen],
  );
  const names = NAMES.format(chosen.map((player) => player.name));
  const [showsAll, setShowsAll] = useState(false);
  const gamesLabelId = useId();
  const [showsDecided, setShowsDecided] = useState(false);
  // Open games lead, since only they can still change the week. With none
  // left, the decided ones are all there is to show. Undefined shows every game.
  const games = useMemo(() => {
    if (comparison == null || showsAll) return undefined;
    const { open, decided } = comparison;
    if (open.size === 0 || showsDecided) return new Set([...open, ...decided]);
    return open;
  }, [comparison, showsAll, showsDecided]);

  return (
    <>
      <div className="compare-players">
        <div className="compare-players__pickers">
          {slots.map((slot, index) => {
            // Each list leaves out the players the other pickers hold.
            const taken = new Set(
              slots.filter(({ key }) => key !== slot.key).map(({ id }) => id),
            );
            const listed = options.filter((option) => !taken.has(option.id));
            return (
              <PlayerPicker
                key={slot.key}
                label={pickerLabel(index)}
                options={listed}
                value={listed.find((option) => option.id === slot.id)}
                onValueChange={(option) => choose(slot.key, option.id)}
                onRemove={
                  slots.length > MIN_PICKERS
                    ? () => remove(slot.key)
                    : undefined
                }
              />
            );
          })}
        </div>
        <AddButton
          disabled={slots.length >= Math.min(MAX_PICKERS, options.length)}
          onClick={add}
        />
        <div role="status" className="compare-players__standing">
          {comparison == null && (
            <p className="analysis__standing">Pick two players to compare</p>
          )}
          {!showsAll && games?.size === 0 && (
            <p className="analysis__standing">
              They picked every game the same
            </p>
          )}
        </div>
        {comparison != null && (
          <div className="compare-players__scope">
            <span className="compare-players__label" id={gamesLabelId}>
              Games
            </span>
            <div
              className="compare-players__choices"
              role="group"
              aria-labelledby={gamesLabelId}
            >
              {GAME_SCOPES.map(({ showsAll: value, label }) => (
                <Button
                  key={label}
                  compact
                  selected={showsAll === value}
                  onClick={() => setShowsAll(value)}
                  className="compare-players__choice"
                >
                  {label}
                </Button>
              ))}
            </div>
          </div>
        )}
        {comparison != null &&
          !showsAll &&
          comparison.open.size > 0 &&
          comparison.decided.size > 0 && (
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
      {comparison != null && (games == null || games.size > 0) && (
        <PicksTable
          scores={scores}
          caption={
            showsAll ? `Picks of ${names}` : `Picks where ${names} differ`
          }
          players={players}
          games={games}
          showsTiebreakers
        />
      )}
    </>
  );
}
