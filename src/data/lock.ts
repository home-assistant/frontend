import {
  HassEntityAttributeBase,
  HassEntityBase,
} from "home-assistant-js-websocket";

export const FORMAT_TEXT = "text";
export const FORMAT_NUMBER = "number";

export const enum LockEntityFeature {
  OPEN = 1,
}

interface LockEntityAttributes extends HassEntityAttributeBase {
  code_format?: string;
  changed_by?: string | null;
}

export interface LockEntity extends HassEntityBase {
  attributes: LockEntityAttributes;
}
