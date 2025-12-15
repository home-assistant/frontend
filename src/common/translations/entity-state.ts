import type { HassConfig, HassEntity } from "home-assistant-js-websocket";
import type { FrontendLocaleData } from "../../data/translation";
import type { HomeAssistant } from "../../types";
import {
  computeEntityNameDisplay,
  type EntityNameItem,
  type EntityNameOptions,
} from "../entity/compute_entity_name_display";
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
export type FormatEntityAttributeUnitFunc = (
  stateObj: HassEntity,
  attribute: string
) => string | undefined;
export type FormatEntityAttributeNameFunc = (
  stateObj: HassEntity,
  attribute: string
) => string;

export type EntityNameType = "entity" | "device" | "area" | "floor";

export type FormatEntityNameFunc = (
  stateObj: HassEntity,
  name: EntityNameItem | EntityNameItem[],
  options?: EntityNameOptions
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
  formatEntityAttributeUnit: FormatEntityAttributeUnitFunc;
  formatEntityAttributeName: FormatEntityAttributeNameFunc;
  formatEntityName: FormatEntityNameFunc;
}> => {
  const { computeStateDisplay } =
    await import("../entity/compute_state_display");
  const {
    computeAttributeValueDisplay,
    computeAttributeUnitDisplay,
    computeAttributeNameDisplay,
  } = await import("../entity/compute_attribute_display");

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
    formatEntityAttributeUnit: (stateObj, attribute) =>
      computeAttributeUnitDisplay(stateObj, config, attribute),
    formatEntityAttributeName: (stateObj, attribute) =>
      computeAttributeNameDisplay(localize, stateObj, entities, attribute),
    formatEntityName: (stateObj, name, options) =>
      computeEntityNameDisplay(
        stateObj,
        name,
        entities,
        devices,
        areas,
        floors,
        options
      ),
  };
};
