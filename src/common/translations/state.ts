import type { HassConfig, HassEntity } from "home-assistant-js-websocket";
import type { FrontendLocaleData } from "../../data/translation";
import type { HomeAssistant } from "../../types";
import type { LocalizeFunc } from "./localize";

export type FormatStateFunc = {
  formatState: (stateObj: HassEntity, state?: string) => string;
  formatAttributeValue: (
    stateObj: HassEntity,
    attribute: string,
    value?: any
  ) => string;
  formatAttributeName: (stateObj: HassEntity, attribute: string) => string;
};

export const computeFormatFunctions = async (
  localize: LocalizeFunc,
  locale: FrontendLocaleData,
  config: HassConfig,
  entities: HomeAssistant["entities"]
): Promise<FormatStateFunc> => {
  const { computeStateDisplay } = await import(
    "../entity/compute_state_display"
  );
  const { computeAttributeValueDisplay, computeAttributeNameDisplay } =
    await import("../entity/compute_attribute_display");

  return {
    formatState: (stateObj, state) =>
      computeStateDisplay(localize, stateObj, locale, config, entities, state),
    formatAttributeValue: (stateObj, attribute, value) =>
      computeAttributeValueDisplay(
        localize,
        stateObj,
        locale,
        config,
        entities,
        attribute,
        value
      ),
    formatAttributeName: (stateObj, attribute) =>
      computeAttributeNameDisplay(localize, stateObj, entities, attribute),
  };
};
