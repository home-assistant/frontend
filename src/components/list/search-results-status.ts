import type { LocalizeFunc } from "../../common/translations/localize";

/**
 * The screen reader message for a list search: how many items match, or that
 * nothing does. A live region is only read out when its text changes, so the
 * message names the search.
 *
 * Returns undefined when there is no search.
 * @param search - The search text
 * @param items - The list rows, with section titles as strings
 * @param isResult - Whether a row is a result, so placeholder rows and rows
 * offered for any search, like "Add custom item", are not counted
 * @param localize - The localize function
 * @param notFoundLabel - The not found label; one that takes the search is
 * used when nothing matches, as it names the search already
 */
export const searchResultsStatus = <T>(
  search: string,
  items: readonly (T | string)[],
  isResult: (item: T) => boolean,
  localize?: LocalizeFunc,
  notFoundLabel?: string | ((search: string) => string)
): string | undefined => {
  if (!search) {
    return undefined;
  }
  const count = items.filter(
    (item): item is T => typeof item !== "string" && isResult(item)
  ).length;
  const term = `‘${search}’`;
  if (!count) {
    return typeof notFoundLabel === "function"
      ? notFoundLabel(search)
      : localize?.("ui.components.combo-box.no_results", { term });
  }
  return localize?.("ui.components.combo-box.result_count", { count, term });
};
