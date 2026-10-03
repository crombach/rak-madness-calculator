import getClasses from "../../utils/getClasses";
import matching from "../../utils/matching";
import DialogCombobox from "../dialog/DialogCombobox";
import PlayerStatusIcon from "../table/playerName/PlayerStatusIcon";
import type { PlayerOption } from "./playerOptions";
import "./PlayerAnalysisDialog.scss";

/** A search over the week's players, each entry marked the way the tables mark them. */
export default function PlayerCombobox({
  ariaLabel,
  ariaDescribedBy,
  options,
  value,
  onValueChange,
  query,
  onQueryChange,
  focusOnMount,
}: {
  ariaLabel: string;
  ariaDescribedBy?: string;
  options: Array<PlayerOption>;
  value?: PlayerOption;
  onValueChange: (chosen: PlayerOption) => void;
  query: string;
  onQueryChange: (query: string) => void;
  focusOnMount?: boolean;
}) {
  return (
    <DialogCombobox<PlayerOption>
      ariaLabel={ariaLabel}
      ariaDescribedBy={ariaDescribedBy}
      placeholder="Search players..."
      emptyMessage="No matching players"
      items={options}
      filteredItems={matching(options, query, (option) => option.name)}
      value={value}
      onValueChange={onValueChange}
      query={query}
      onQueryChange={onQueryChange}
      itemToStringLabel={(option) => option.name}
      itemKey={(option) => option.id}
      optionClassName={(option) =>
        getClasses("player-analysis__option", {
          "--knocked-out": option.isKnockedOut,
          // After the standing, which it stands over: a name two rows share
          // has no standing of its own to show.
          "--name-conflict": option.hasNameConflict,
        })
      }
      // The player named in the input is marked the way the tables do.
      adornment={
        value != null && (
          <span
            className={getClasses("player-analysis__input-status", {
              "--knocked-out": value.isKnockedOut,
              "--name-conflict": value.hasNameConflict,
            })}
          >
            <PlayerStatusIcon
              isKnockedOut={value.isKnockedOut}
              hasNameConflict={value.hasNameConflict}
            />
          </span>
        )
      }
      focusOnMount={focusOnMount}
      // An entry carries the status icon the tables give the same player, in
      // the hue they fill that player's cell with.
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
  );
}
