import type { HassConfig, HassEntity } from "home-assistant-js-websocket";
import type { FrontendLocaleData } from "../../data/translation";
import type { HomeAssistant } from "../../types";
import { ensureArray } from "../array/ensure-array";
import { computeAreaName } from "../entity/compute_area_name";
import { computeDeviceName } from "../entity/compute_device_name";
import { computeEntityName } from "../entity/compute_entity_name";
import { computeFloorName } from "../entity/compute_floor_name";
import { getEntityContext } from "../entity/context/get_entity_context";
import type { LocalizeFunc } from "./localize";

export type FormatEntityStateFunc = (
  stateObj: HassEntity,
  state?: string
) => string;
export type FormatEntityAttributeValueFunc = (
  stateObj: HassEntity,
  attribute: string,
  value?: any
) => string;
export type FormatEntityAttributeNameFunc = (
  stateObj: HassEntity,
  attribute: string
) => string;

export type EntityNameType = "entity" | "device" | "area" | "floor";

export type FormatEntityNameFunc = (
  stateObj: HassEntity,
  type: EntityNameType | EntityNameType[],
  separator?: string
) => string;

export const computeFormatFunctions = async (
  localize: LocalizeFunc,
  locale: FrontendLocaleData,
  config: HassConfig,
  entities: HomeAssistant["entities"],
  devices: HomeAssistant["devices"],
  areas: HomeAssistant["areas"],
  floors: HomeAssistant["floors"],
  sensorNumericDeviceClasses: string[]
): Promise<{
  formatEntityState: FormatEntityStateFunc;
  formatEntityAttributeValue: FormatEntityAttributeValueFunc;
  formatEntityAttributeName: FormatEntityAttributeNameFunc;
  formatEntityName: FormatEntityNameFunc;
}> => {
  const { computeStateDisplay } = await import(
    "../entity/compute_state_display"
  );
  const { computeAttributeValueDisplay, computeAttributeNameDisplay } =
    await import("../entity/compute_attribute_display");

  return {
    formatEntityState: (stateObj, state) =>
      computeStateDisplay(
        localize,
        stateObj,
        locale,
        sensorNumericDeviceClasses,
        config,
        entities,
        state
      ),
    formatEntityAttributeValue: (stateObj, attribute, value) =>
      computeAttributeValueDisplay(
        localize,
        stateObj,
        locale,
        config,
        entities,
        attribute,
        value
      ),
    formatEntityAttributeName: (stateObj, attribute) =>
      computeAttributeNameDisplay(localize, stateObj, entities, attribute),
    formatEntityName: (stateObj, type, separator = " ") => {
      const types = ensureArray(type);

      const { device, area, floor } = getEntityContext(
        stateObj,
        entities,
        devices,
        areas,
        floors
      );

      const names = types
        .map((t) => {
          switch (t) {
            case "entity":
              return computeEntityName(stateObj, entities, devices);
            case "device":
              return device ? computeDeviceName(device) : undefined;
            case "area":
              return area ? computeAreaName(area) : undefined;
            case "floor":
              return floor ? computeFloorName(floor) : undefined;
            default:
              return t;
          }
        })
        .filter((name) => name !== undefined);

      return names.join(separator);
    },
  };
};
