import { Select } from "@base-ui/react/select";
import { UnfoldMoreIcon } from "../icon/Icon";

/**
 * The season and week pickers' shared shape: a Base UI select styled by
 * `home__week-input`/`select__*`, so both read from one place instead of
 * drifting apart one field at a time. Those rules live in HomePage.scss,
 * its only caller's sheet.
 */
export default function LabeledSelect<T>({
  ariaLabel,
  className,
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
          className="select__positioner"
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
