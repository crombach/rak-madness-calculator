import { useEffect, useMemo, useState } from "react";
import { isMyPlayer, useSettings } from "../../context/SettingsContext";
import { PlayerScore, RakMadnessScores } from "../../types/RakMadnessScores";
import differingGames, { sameGames } from "../../utils/scoring/differingGames";
import { playerOptions } from "../playerAnalysis/PlayerAnalysisDialog";
import { RESULTS_PAGE } from "../results/resultsPath";
import PicksTable from "../table/picks/PicksTable";
import SkeletonTable from "../table/SkeletonTable";
import {
  MAX_PICKERS,
  GameScope,
  MIN_PICKERS,
  readComparedPlayers,
  readGameScope,
  writeComparedPlayers,
  writeGameScope,
} from "./comparedPlayers";
import ComparePlayersDialog, { Slot } from "./ComparePlayersDialog";
import { ChooseButton, GamesToggle } from "./ComparePlayersSkeleton";
// For `analysis__standing`, which this page shares with the analysis dialog.
import "../playerAnalysis/AnalysisSummary.scss";
import "./ComparePlayers.scss";

const NAMES = new Intl.ListFormat("en", { type: "conjunction" });

/** What the page says in place of a table the scope leaves no games in. */
const EMPTY_MESSAGES: Record<Exclude<GameScope, "all">, string> = {
  different: "They picked every game the same",
  same: "They picked every game differently",
};

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

/** Two to ten players' picks in one table, on every game or those they split or share. */
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
  // Opens on the pickers when fewer than two players come back from last time.
  const [isOpen, setIsOpen] = useState(
    () => slots.filter(({ id }) => id != null).length < MIN_PICKERS,
  );
  const [scope, setScope] = useState(readGameScope);
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
    writeGameScope(scope);
  }, [scope]);

  const players = useMemo(
    () => new Set(chosen.map((player) => player.id)),
    [chosen],
  );
  // Undefined shows every game.
  const games = useMemo(() => {
    if (chosen.length < MIN_PICKERS || scope === "all") return undefined;
    return scope === "different" ? differingGames(chosen) : sameGames(chosen);
  }, [chosen, scope]);
  const names = NAMES.format(chosen.map((player) => player.name));
  const isReady = chosen.length >= MIN_PICKERS;
  const captions: Record<GameScope, string> = {
    all: `Picks of ${names}`,
    different: `Picks where ${names} differ`,
    same: `Picks where ${names} agree`,
  };

  return (
    <>
      <div className="compare-players">
        <div className="compare-players__controls">
          <ChooseButton onClick={() => setIsOpen(true)} />
          <GamesToggle scope={scope} onChange={setScope} disabled={!isReady} />
        </div>
        <div role="status" className="compare-players__standing">
          {scope !== "all" && games?.size === 0 && (
            <p className="analysis__standing">{EMPTY_MESSAGES[scope]}</p>
          )}
        </div>
      </div>
      {!isReady && (
        <SkeletonTable view={RESULTS_PAGE.comparePlayers} loading={false} />
      )}
      {isReady && (games == null || games.size > 0) && (
        <PicksTable
          scores={scores}
          caption={captions[scope]}
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
