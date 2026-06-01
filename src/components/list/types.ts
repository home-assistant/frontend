import type { HaListItemBase } from "../item/ha-list-item-base";

export interface HaListSelectedDetail {
  index: number | Set<number>;
  diff?: { added: Set<number>; removed: Set<number> };
  value?: string | string[];
}

export interface HaListValueChangedDetail {
  value: string[];
  added: string[];
  removed: string[];
}

export interface HaListActivatedDetail {
  index: number;
  item: HaListItemBase;
}

export interface HaListItemRegistrationDetail {
  item: HaListItemBase;
}

declare global {
  interface HASSDomEvents {
    "ha-list-selected": HaListSelectedDetail;
    "ha-list-value-changed": HaListValueChangedDetail;
    "ha-list-activated": HaListActivatedDetail;
    "ha-list-item-register": HaListItemRegistrationDetail;
    "ha-list-item-unregister": HaListItemRegistrationDetail;
  }
}
