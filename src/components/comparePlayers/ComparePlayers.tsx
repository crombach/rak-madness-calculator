import { useEffect, useMemo, useState } from "react";
import { isMyPlayer, useSettings } from "../../context/SettingsContext";
import { PlayerScore, RakMadnessScores } from "../../types/RakMadnessScores";
import differingGames from "../../utils/scoring/differingGames";
import { playerOptions } from "../playerAnalysis/PlayerAnalysisDialog";
import PicksTable from "../table/picks/PicksTable";
import {
  MAX_PICKERS,
  MIN_PICKERS,
  readComparedPlayers,
  readShowsAll,
  writeComparedPlayers,
  writeShowsAll,
} from "./comparedPlayers";
import ComparePlayersDialog, { Slot } from "./ComparePlayersDialog";
import { ChooseButton, GamesToggle } from "./ComparePlayersSkeleton";
// For `analysis__standing`, which this page shares with the analysis dialog.
import "../playerAnalysis/AnalysisSummary.scss";
import "./ComparePlayers.scss";

const NAMES = new Intl.ListFormat("en", { type: "conjunction" });

let slotCount = 0;

function newSlot(id?: string): Slot {
  return { key: slotCount++, id };
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

/** Two to ten players' picks in one table, on the games they split or all. */
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
  const [isOpen, setIsOpen] = useState(false);
  const [showsAll, setShowsAll] = useState(readShowsAll);
  const [addedKey, setAddedKey] = useState<number>();
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

  useEffect(() => {
    writeShowsAll(showsAll);
  }, [showsAll]);

  const players = useMemo(
    () => new Set(chosen.map((player) => player.id)),
    [chosen],
  );
  // Undefined shows every game.
  const games = useMemo(
    () =>
      chosen.length < MIN_PICKERS || showsAll
        ? undefined
        : differingGames(chosen),
    [chosen, showsAll],
  );
  const names = NAMES.format(chosen.map((player) => player.name));
  const isReady = chosen.length >= MIN_PICKERS;

  return (
    <>
      <div className="compare-players">
        <div className="compare-players__controls">
          <ChooseButton onClick={() => setIsOpen(true)} />
          <GamesToggle
            showsAll={showsAll}
            onChange={setShowsAll}
            disabled={!isReady}
          />
        </div>
        <div role="status" className="compare-players__standing">
          {games?.size === 0 && (
            <p className="analysis__standing">
              They picked every game the same
            </p>
          )}
        </div>
      </div>
      {isReady && (games == null || games.size > 0) && (
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
      <ComparePlayersDialog
        open={isOpen}
        onOpenChange={setIsOpen}
        options={options}
        slots={slots}
        canAdd={slots.length < Math.min(MAX_PICKERS, options.length)}
        onChoose={(key, id) =>
          setSlots(slots.map((slot) => (slot.key === key ? { key, id } : slot)))
        }
        onAdd={() => {
          const slot = newSlot();
          setSlots([...slots, slot]);
          setAddedKey(slot.key);
        }}
        addedKey={addedKey}
        onRemove={(key) => setSlots(slots.filter((slot) => slot.key !== key))}
      />
    </>
  );
}
