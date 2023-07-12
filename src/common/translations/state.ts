import type { HassConfig, HassEntity } from "home-assistant-js-websocket";
import type { FrontendLocaleData } from "../../data/translation";
import type { HomeAssistant } from "../../types";
import type { LocalizeFunc } from "./localize";

export type FormatStateFunc = (stateObj: HassEntity, state?: string) => string;

export const computeFormatState = async (
  localize: LocalizeFunc,
  locale: FrontendLocaleData,
  config: HassConfig,
  entities: HomeAssistant["entities"]
): Promise<FormatStateFunc> => {
  const { computeStateDisplay } = await import(
    "../entity/compute_state_display"
  );

  return (stateObj, state) =>
    computeStateDisplay(localize, stateObj, locale, config, entities, state);
};
