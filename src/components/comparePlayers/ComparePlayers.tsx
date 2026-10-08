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
  isSameName,
  MIN_PICKERS,
  MIN_SCOPED,
  deletePreset,
  readComparedPlayers,
  readGameScope,
  readPresets,
  readShowsLeader,
  renamePreset,
  savePreset,
  writeComparedPlayers,
  writeGameScope,
  writeShowsLeader,
} from "./comparedPlayers";
import ComparePlayersDialog, { Slot } from "./ComparePlayersDialog";
import { GamesToggle, PlayersGroup } from "./ComparePlayersControls";
import ComparePresetsDialog from "./ComparePresetsDialog";
import useStatus from "./useStatus";
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
 * A picker per name, holding this week's row for it or, where the week has no row
 * by that name, the name alone. A name given more often than the week has rows for
 * it keeps only the rows.
 */
function slotsFor(names: Array<string>, players: Array<PlayerScore>) {
  const slots: Array<Slot> = [];
  for (const name of names) {
    const row = players.find(
      (player) =>
        isSameName(player.name, name) &&
        !slots.some(({ id }) => id === player.id),
    );
    if (row != null) slots.push(newSlot({ id: row.id }));
    else if (!players.some((player) => isSameName(player.name, name))) {
      slots.push(newSlot({ missingName: name }));
    }
  }
  return slots;
}

function padded(slots: Array<Slot>): Array<Slot> {
  while (slots.length < MIN_PICKERS) slots.push(newSlot());
  return slots;
}

/** The saved names' pickers, or the reader's own row when nothing is saved. */
function startingSlots(
  players: Array<PlayerScore>,
  myName: string,
): Array<Slot> {
  const slots = slotsFor(readComparedPlayers(), players);
  if (slots.length === 0) {
    const mine = players.find((player) => isMyPlayer(player.name, myName));
    if (mine != null) slots.push(newSlot({ id: mine.id }));
  }
  return padded(slots);
}

/**
 * One to ten players' picks in one table, on every game or those they split or
 * share. The week's leader can join them beyond the ten-player limit.
 */
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
  const [showsLeader, setShowsLeader] = useState(readShowsLeader);
  const [presets, setPresets] = useState(readPresets);
  const picked = useMemo(() => playersIn(slots, scores), [slots, scores]);
  // The week's leader, when shown and not picked already. It holds no picker.
  const top = scores?.scores[0];
  const leader =
    showsLeader && top != null && !picked.includes(top) ? top : undefined;
  // Opens on the pickers when no player comes back from last time, and no leader shows.
  const [isOpen, setIsOpen] = useState(
    () => slots.filter(isFilled).length + (leader ? 1 : 0) < MIN_PICKERS,
  );
  const [scope, setScope] = useState(readGameScope);
  const [addedKey, setAddedKey] = useState<number>();
  const chooseRef = useRef<HTMLButtonElement>(null);
  const [isPresetsOpen, setIsPresetsOpen] = useState(false);
  // The presets dialog's own status closes with it, so a load speaks here, once
  // the close lets a screen reader hear the page again.
  const [status, announce] = useStatus();
  const loaded = useRef<string>(undefined);
  const presetsRef = useRef<HTMLButtonElement>(null);
  const chosen = useMemo(
    () => (leader ? [...picked, leader] : picked),
    [picked, leader],
  );
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
  const canScope = chosen.length >= MIN_SCOPED;
  // Undefined shows every game.
  const games = useMemo(() => {
    if (!canScope || scope === "all") return undefined;
    return scope === "different" ? differingGames(chosen) : sameGames(chosen);
  }, [canScope, chosen, scope]);
  const names = NAMES.format([
    ...namesIn(slots, scores),
    ...(leader ? [leader.name] : []),
  ]);
  const captions: Record<GameScope, string> = {
    all: `Picks of ${names}`,
    different: `Picks where ${names} differ`,
    same: `Picks where ${names} agree`,
  };

  return (
    <>
      <div className="compare-players">
        <div className="compare-players__controls">
          <PlayersGroup
            choose={{
              ref: chooseRef,
              isOpen,
              onClick: () => {
                // Here rather than on close, where the dialog would shrink as it fades.
                setSlots(withoutEmptySlots(slots));
                setIsOpen(true);
              },
            }}
            leader={{
              on: showsLeader,
              onChange: (on) => {
                setShowsLeader(on);
                writeShowsLeader(on);
              },
              disabled: top == null,
            }}
            presets={{
              ref: presetsRef,
              isOpen: isPresetsOpen,
              onClick: () => setIsPresetsOpen(true),
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
        // A missing player holds a picker without being one of the week's options.
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
      <ComparePresetsDialog
        open={isPresetsOpen}
        onOpenChange={setIsPresetsOpen}
        finalFocus={presetsRef}
        presets={presets}
        canSave={slots.some(isFilled)}
        onLoad={({ name, players }) => {
          changeSlots(padded(slotsFor(players, scores?.scores ?? [])));
          loaded.current = name;
        }}
        onCloseComplete={() => {
          if (loaded.current != null) announce(`Loaded ${loaded.current}`);
          loaded.current = undefined;
        }}
        onSave={(name) =>
          setPresets(savePreset(presets, name, namesIn(slots, scores)))
        }
        onRename={(from, to) => setPresets(renamePreset(presets, from, to))}
        onDelete={(name) => setPresets(deletePreset(presets, name))}
      />
      <p role="status" className="compare-players__status">
        {status}
      </p>
    </>
  );
}
