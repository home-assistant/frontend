import type { HaListItemBase } from "../item/ha-list-item-base";
import type { HaListBase } from "./ha-list-base";

/** Where `moveActiveItem()` moves the active row of a list. */
export type HaListMoveTarget =
  "next" | "previous" | "first" | "last" | "next-page" | "previous-page";

/** Range of rows a virtualized list currently shows. */
export interface HaListVisibilityChangedDetail {
  first: number;
  last: number;
}

export interface HaListActivatedDetail {
  index: number;
  item: HaListItemBase;
}

export interface HaListItemRegistrationDetail {
  item: HaListItemBase;
  list?: HaListBase;
}

declare global {
  interface HASSDomEvents {
    "ha-list-item-selected": number;
    "ha-list-item-deselected": number;
    "ha-list-activated": HaListActivatedDetail;
    "ha-list-visibility-changed": HaListVisibilityChangedDetail;
    "ha-list-item-register": HaListItemRegistrationDetail;
    "ha-list-item-unregister": HaListItemRegistrationDetail;
  }
}
