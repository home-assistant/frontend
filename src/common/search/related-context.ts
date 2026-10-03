import type { PickerComboBoxItem } from "../../components/ha-picker-combo-box";
import type { ItemType, RelatedResult } from "../../data/search";

export interface RelatedIdSets {
  areas: Set<string>;
  devices: Set<string>;
  entities: Set<string>;
}

/**
 * Build a set of related IDs, merging in the current (queried) item.
 * `search/related` does not echo the queried item back, but it is the closest
 * related item (e.g. a card editor's own entity), so it is merged into the
 * matching group when it is an area, device, or entity.
 * @param related - The related result to build the sets from.
 * @param current - The queried item to merge in.
 * @returns The related ID sets, including the current item.
 */
export const buildRelatedIdSets = (
  related?: RelatedResult,
  current?: { itemType: ItemType; itemId: string }
): RelatedIdSets => ({
  areas: new Set([
    ...(related?.area || []),
    ...(current?.itemType === "area" ? [current.itemId] : []),
  ]),
  devices: new Set([
    ...(related?.device || []),
    ...(current?.itemType === "device" ? [current.itemId] : []),
  ]),
  entities: new Set([
    ...(related?.entity || []),
    ...(current?.itemType === "entity" ? [current.itemId] : []),
  ]),
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
