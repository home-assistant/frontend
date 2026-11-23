import type {
  HassEntityAttributeBase,
  HassEntityBase,
} from "home-assistant-js-websocket";
import type { HomeAssistant } from "../types";

interface TextEntityAttributes extends HassEntityAttributeBase {
  min?: number;
  max?: number;
  pattern?: string;
  mode?: "text" | "password";
}

export interface TextEntity extends HassEntityBase {
  attributes: TextEntityAttributes;
}

export const setValue = (
  callService: HomeAssistant["callService"],
  entity: string,
  value: string
) => callService("text", "set_value", { value }, { entity_id: entity });
