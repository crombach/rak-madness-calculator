import { Select } from "@base-ui/react/select";
import { UnfoldMoreIcon } from "../icon/Icon";
import "./LabeledSelect.scss";

/** Title case, to read like the week labels ESPN sends. */
export const seasonLabel = (season: number) => `${season} Season`;

/**
 * A Base UI select in the app's one `select__*` look, read as a readout rather
 * than a form field. Backs the home page's season and week pickers, and the
 * same pair in the nav drawer.
 */
export default function LabeledSelect<T>({
  ariaLabel,
  className,
  positionerClassName = "select__positioner",
  value,
  onValueChange,
  disabled,
  placeholder,
  renderValue,
  items,
  itemKey,
  itemLabel,
}: {
  ariaLabel: string;
  className: string;
  /** Left out for the app's default overlay stacking. */
  positionerClassName?: string;
  value: T | null;
  onValueChange: (value: T | null) => void;
  disabled?: boolean;
  placeholder: string;
  renderValue: (value: T) => string;
  items: Array<T>;
  itemKey: (item: T) => string | number;
  itemLabel: (item: T) => string;
}) {
  return (
    <Select.Root
      value={value}
      onValueChange={onValueChange}
      disabled={disabled}
    >
      <Select.Trigger aria-label={ariaLabel} className={className}>
        <Select.Value>
          {(current: T | null) =>
            current != null ? renderValue(current) : placeholder
          }
        </Select.Value>
        <Select.Icon className="select__icon">
          <UnfoldMoreIcon />
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Positioner
          className={positionerClassName}
          sideOffset={4}
          // Base UI otherwise lays the popup over the trigger and sizes it
          // to the viewport to do so, past the rows the stylesheet allows.
          alignItemWithTrigger={false}
        >
          <Select.Popup className="select__popup">
            {items.map((item) => (
              <Select.Item
                key={itemKey(item)}
                value={item}
                className="select__item"
              >
                <Select.ItemText>{itemLabel(item)}</Select.ItemText>
              </Select.Item>
            ))}
          </Select.Popup>
        </Select.Positioner>
      </Select.Portal>
    </Select.Root>
  );
}
