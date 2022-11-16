import {
  HassEntityAttributeBase,
  HassEntityBase,
} from "home-assistant-js-websocket";
import { HomeAssistant } from "../types";

interface DatetimeEntityAttributes extends HassEntityAttributeBase {
  year?: number;
  month?: number;
  day?: number;
  hour?: number;
  minute?: number;
  second?: number;
}

export interface DatetimeEntity extends HassEntityBase {
  attributes: DatetimeEntityAttributes;
}

export const stateToIsoDateString = (entityState: DatetimeEntity) =>
  `${entityState.attributes.year || "1970"}-${String(
    entityState.attributes.month || "01"
  ).padStart(2, "0")}-${String(entityState.attributes.day || "01").padStart(
    2,
    "0"
  )}T${String(entityState.attributes.hour || "00").padStart(2, "0")}:${String(
    entityState.attributes.minute || "00"
  ).padStart(2, "0")}:${String(entityState.attributes.second || "00").padStart(
    2,
    "0"
  )}`;

export const setDateTimeValue = (
  hass: HomeAssistant,
  entityId: string,
  date: string | undefined = undefined,
  time: string | undefined = undefined
) => {
  const param = { entity_id: entityId, date: date, time: time };
  hass.callService(entityId.split(".", 1)[0], "set_value", param);
};
