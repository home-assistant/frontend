import type { LocalizeFunc } from "../common/translations/localize";

export type PickerNavigationDirection = "next" | "previous";

interface PickerOption {
  id: string;
  primary: string;
  secondary?: string;
  disabled?: boolean;
}

type PickerOptionPredicate<T extends PickerOption> = (
  item: T | string
) => item is T;

export const getInitialActivePickerItemIndex = <T extends PickerOption>(
  items: readonly (T | string)[],
  value: string | undefined,
  search: string,
  direction: PickerNavigationDirection,
  isOption: PickerOptionPredicate<T>
): number => {
  if (!search && value) {
    const selectedIndex = items.findIndex(
      (item) => isOption(item) && item.id === value && !item.disabled
    );
    if (selectedIndex !== -1) {
      return selectedIndex;
    }
  }

  const step = direction === "next" ? 1 : -1;
  for (
    let index = direction === "next" ? 0 : items.length - 1;
    index >= 0 && index < items.length;
    index += step
  ) {
    const item = items[index];
    if (item && isOption(item) && !item.disabled) {
      return index;
    }
  }

  return -1;
};

export const getPickerOptionAnnouncement = <T extends PickerOption>(
  items: readonly (T | string)[],
  index: number,
  value: string | undefined,
  isOption: PickerOptionPredicate<T>,
  localize?: LocalizeFunc
): string | undefined => {
  const item = items[index];
  if (!item || !isOption(item) || item.disabled) {
    return undefined;
  }

  const options = items.filter(
    (candidate): candidate is T => isOption(candidate) && !candidate.disabled
  );
  const label = [item.primary, item.secondary].filter(Boolean).join(", ");
  const selected = item.id === value;
  const key = selected
    ? "ui.components.combo-box.selected_option"
    : "ui.components.combo-box.active_option";
  const values = {
    index: options.indexOf(item) + 1,
    count: options.length,
    option: label || item.id,
  };

  return (
    localize?.(key, values) ??
    `${selected ? "Selected option" : "Option"} ${values.index} of ${values.count}: ${values.option}`
  );
};
