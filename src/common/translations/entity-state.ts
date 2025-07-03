import type { HassConfig, HassEntity } from "home-assistant-js-websocket";
import type { FrontendLocaleData } from "../../data/translation";
import type { HomeAssistant } from "../../types";
import type { LocalizeFunc } from "./localize";
import { computeEntityName } from "../entity/compute_entity_name";
import { computeDeviceName } from "../entity/compute_device_name";
import { getEntityContext } from "../entity/context/get_entity_context";
import { computeAreaName } from "../entity/compute_area_name";
import { computeFloorName } from "../entity/compute_floor_name";
import { ensureArray } from "../array/ensure-array";

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
      const namesList: (string | undefined)[] = [];

      const { device, area, floor } = getEntityContext(
        stateObj,
        entities,
        devices,
        areas,
        floors
      );

      for (const t of types) {
        switch (t) {
          case "entity": {
            namesList.push(computeEntityName(stateObj, entities, devices));
            break;
          }
          case "device": {
            if (device) {
              namesList.push(computeDeviceName(device));
            }
            break;
          }
          case "area": {
            if (area) {
              namesList.push(computeAreaName(area));
            }
            break;
          }
          case "floor": {
            if (floor) {
              namesList.push(computeFloorName(floor));
            }
            break;
          }
        }
      }
      return namesList.filter((name) => name !== undefined).join(separator);
    },
  };
};
