import {
  HassEntityAttributeBase,
  HassEntityBase,
} from "home-assistant-js-websocket";
import { HomeAssistant } from "../types";

interface TimeEntityAttributes extends HassEntityAttributeBase {
  hour?: number;
  minute?: number;
  second?: number;
}

export interface TimeEntity extends HassEntityBase {
  attributes: TimeEntityAttributes;
}

export const setTimeValue = (
  hass: HomeAssistant,
  entityId: string,
  time: string | undefined = undefined
) => {
  const param = { entity_id: entityId, time: time };
  hass.callService(entityId.split(".", 1)[0], "set_value", param);
};
