import type { PickerComboBoxItem } from "../../components/ha-picker-combo-box";
import type { RelatedResult } from "../../data/search";

export interface RelatedIdSets {
  areas: Set<string>;
  devices: Set<string>;
  entities: Set<string>;
}

/**
 * Build a set of related IDs for a given related result.
 * @param related - The related result to build the sets from.
 * @returns The related ID sets.
 */
export const buildRelatedIdSets = (related?: RelatedResult): RelatedIdSets => ({
  areas: new Set(related?.area || []),
  devices: new Set(related?.device || []),
  entities: new Set(related?.entity || []),
});

/**
 * Stable partition sort: related items float to the top,
 * preserving relative order (e.g. Fuse score) within each group.
 * @param items - The items to sort.
 * @returns The sorted items.
 */
export const sortRelatedFirst = (
  items: PickerComboBoxItem[]
): PickerComboBoxItem[] =>
  [...items].sort((a, b) => {
    const aRelated = Boolean(a.isRelated);
    const bRelated = Boolean(b.isRelated);
    if (aRelated === bRelated) {
      return 0;
    }
    return aRelated ? -1 : 1;
  });
