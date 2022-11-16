import {
  HassEntityAttributeBase,
  HassEntityBase,
} from "home-assistant-js-websocket";
import { HomeAssistant } from "../types";

interface DateEntityAttributes extends HassEntityAttributeBase {
  year?: number;
  month?: number;
  day?: number;
}

export interface DateEntity extends HassEntityBase {
  attributes: DateEntityAttributes;
}

export const stateToIsoDateString = (entityState: DateEntity) =>
  `${entityState.attributes.year || "1970"}-${String(
    entityState.attributes.month || "01"
  ).padStart(2, "0")}-${String(entityState.attributes.day || "01").padStart(
    2,
    "0"
  )}T00:00:00`;

export const setDateValue = (
  hass: HomeAssistant,
  entityId: string,
  date: string | undefined = undefined
) => {
  const param = { entity_id: entityId, date };
  hass.callService(entityId.split(".", 1)[0], "set_value", param);
};
