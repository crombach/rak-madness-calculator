import { useMemo, useRef, useState } from "react";
import { isMyPlayer, useSettings } from "../../context/SettingsContext";
import { PlayerScore, RakMadnessScores } from "../../types/RakMadnessScores";
import differingGames, { sameGames } from "../../utils/scoring/differingGames";
import { playerOptions } from "../playerAnalysis/playerOptions";
import EmptyState from "../pageLayout/EmptyState";
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
import { ChooseButton, GamesToggle } from "./ComparePlayersControls";
import "./ComparePlayers.scss";

const NAMES = new Intl.ListFormat("en", { type: "conjunction" });

/** What the page says in place of a table the scope leaves no games in. */
const EMPTY_MESSAGES: Record<Exclude<GameScope, "all">, string> = {
  different: "They picked every game the same",
  same: "They picked every game differently",
};

let slotCount = 0;

function newSlot(slot: Omit<Slot, "key"> = {}): Slot {
  return { key: slotCount++, ...slot };
}

/** Whether a picker holds a player, this week's row or a saved name it lacks. */
function isFilled({ id, missingName }: Slot): boolean {
  return id != null || missingName != null;
}

/** Drops the empty pickers, except the first empty ones it needs to keep `MIN_PICKERS`. */
function withoutEmptySlots(slots: Array<Slot>): Array<Slot> {
  let spare = MIN_PICKERS - slots.filter(isFilled).length;
  return slots.filter((slot) => isFilled(slot) || spare-- > 0);
}

/** The rows the pickers hold, in picker order. */
function playersIn(slots: Array<Slot>, scores?: RakMadnessScores) {
  return slots.flatMap(
    ({ id }) => scores?.scores.find((player) => player.id === id) ?? [],
  );
}

/** The name each filled picker holds, in picker order. */
function namesIn(slots: Array<Slot>, scores?: RakMadnessScores) {
  return slots.flatMap(
    ({ id, missingName }) =>
      scores?.scores.find((player) => player.id === id)?.name ??
      missingName ??
      [],
  );
}

/**
 * A picker per saved name, holding this week's row for it or, where the week has
 * no row by that name, the name alone. A name saved more often than the week has
 * rows for it keeps only the rows. Falls back to the reader's own row when nothing
 * is saved.
 */
function startingSlots(
  players: Array<PlayerScore>,
  myName: string,
): Array<Slot> {
  const slots: Array<Slot> = [];
  for (const name of readComparedPlayers()) {
    const row = players.find(
      (player) =>
        player.name === name && !slots.some(({ id }) => id === player.id),
    );
    if (row != null) slots.push(newSlot({ id: row.id }));
    else if (!players.some((player) => player.name === name)) {
      slots.push(newSlot({ missingName: name }));
    }
  }
  if (slots.length === 0) {
    const mine = players.find((player) => isMyPlayer(player.name, myName));
    if (mine != null) slots.push(newSlot({ id: mine.id }));
  }
  while (slots.length < MIN_PICKERS) slots.push(newSlot());
  return slots;
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
    startingSlots(scores?.scores ?? [], playerName),
  );
  // Opens on the pickers when fewer than two players come back from last time.
  const [isOpen, setIsOpen] = useState(
    () => slots.filter(isFilled).length < MIN_PICKERS,
  );
  const [scope, setScope] = useState(readGameScope);
  const [addedKey, setAddedKey] = useState<number>();
  const chooseRef = useRef<HTMLButtonElement>(null);
  const chosen = useMemo(() => playersIn(slots, scores), [slots, scores]);
  const missing = useMemo(
    () => slots.flatMap(({ missingName }) => missingName ?? []),
    [slots],
  );
  const changeSlots = (next: Array<Slot>) => {
    setSlots(next);
    writeComparedPlayers(namesIn(next, scores));
  };

  const players = useMemo(
    () => new Set(chosen.map((player) => player.id)),
    [chosen],
  );
  const isReady = chosen.length + missing.length >= MIN_PICKERS;
  // A player with no picks this week neither splits nor shares a game, so the
  // scope reads only the players with picks.
  const canScope = chosen.length >= MIN_PICKERS;
  // Undefined shows every game.
  const games = useMemo(() => {
    if (!canScope || scope === "all") return undefined;
    return scope === "different" ? differingGames(chosen) : sameGames(chosen);
  }, [canScope, chosen, scope]);
  const names = NAMES.format(namesIn(slots, scores));
  const captions: Record<GameScope, string> = {
    all: `Picks of ${names}`,
    different: `Picks where ${names} differ`,
    same: `Picks where ${names} agree`,
  };

  return (
    <>
      <div className="compare-players">
        <div className="compare-players__controls">
          <ChooseButton
            ref={chooseRef}
            onClick={() => {
              // Here rather than on close, where the dialog would shrink as it fades.
              setSlots(withoutEmptySlots(slots));
              setIsOpen(true);
            }}
          />
          <GamesToggle
            scope={scope}
            onChange={(next) => {
              setScope(next);
              writeGameScope(next);
            }}
            disabled={!canScope}
          />
        </div>
        <EmptyState className="compare-players__standing">
          {scope !== "all" && games?.size === 0
            ? EMPTY_MESSAGES[scope]
            : undefined}
        </EmptyState>
      </div>
      {!isReady && (
        <SkeletonTable view={RESULTS_PAGE.comparePlayers} loading={false} />
      )}
      {isReady && (games == null || games.size > 0) && (
        <PicksTable
          scores={scores}
          caption={captions[canScope ? scope : "all"]}
          players={players}
          missingNames={missing}
          games={games}
          showsTiebreakers
        />
      )}
      <ComparePlayersDialog
        open={isOpen}
        onOpenChange={(open) => {
          setIsOpen(open);
          // Focus goes to the picker Add Player made once, not on every reopen.
          if (!open) setAddedKey(undefined);
        }}
        finalFocus={chooseRef}
        options={options}
        slots={slots}
        canAdd={
          slots.length < Math.min(MAX_PICKERS, options.length + missing.length)
        }
        onChoose={(key, id) =>
          changeSlots(
            slots.map((slot) => (slot.key === key ? { key, id } : slot)),
          )
        }
        onAdd={() => {
          const slot = newSlot();
          setSlots([...slots, slot]);
          setAddedKey(slot.key);
        }}
        addedKey={addedKey}
        onRemove={(key) => {
          const next = slots.filter((slot) => slot.key !== key);
          // An empty picker holds no choice, so removing it changes none.
          const removed = slots.find((slot) => slot.key === key);
          if (removed == null || !isFilled(removed)) setSlots(next);
          else changeSlots(next);
        }}
      />
    </>
  );
}
