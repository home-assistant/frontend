import type { HomeAssistant } from "../types";
import type {
  HassEntityAttributeBase,
  HassEntityBase,
} from "home-assistant-js-websocket";

interface TextEntityAttributes extends HassEntityAttributeBase {
  min?: number;
  max?: number;
  pattern?: string;
  mode?: "text" | "password";
}

export interface TextEntity extends HassEntityBase {
  attributes: TextEntityAttributes;
}

export const setValue = (hass: HomeAssistant, entity: string, value: string) =>
  hass.callService("text", "set_value", { value }, { entity_id: entity });
