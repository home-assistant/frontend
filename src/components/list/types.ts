import type { HaListItemBase } from "../item/ha-list-item-base";

export interface HaListActivatedDetail {
  index: number;
  item: HaListItemBase;
}

export interface HaListItemRegistrationDetail {
  item: HaListItemBase;
}

declare global {
  interface HASSDomEvents {
    "ha-list-item-selected": number;
    "ha-list-item-deselected": number;
    "ha-list-activated": HaListActivatedDetail;
    "ha-list-item-register": HaListItemRegistrationDetail;
    "ha-list-item-unregister": HaListItemRegistrationDetail;
  }
}
