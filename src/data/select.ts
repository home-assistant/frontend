import type {
  HassEntityAttributeBase,
  HassEntityBase,
} from "home-assistant-js-websocket";
import type { HomeAssistant } from "../types";

interface SelectEntityAttributes extends HassEntityAttributeBase {
  options: string[];
}

export interface SelectEntity extends HassEntityBase {
  attributes: SelectEntityAttributes;
}

export const setSelectOption = (
  callService: HomeAssistant["callService"],
  entity: string,
  option: string
) => callService("select", "select_option", { option }, { entity_id: entity });
