import type { HassConfig, HassEntity } from "home-assistant-js-websocket";
import type { EntityRegistryDisplayEntry } from "../../data/entity_registry";
import type { LocalizeFunc } from "./localize";
import type { FrontendLocaleData } from "../../data/translation";

export type FormatStateFunc = (
  stateObj: HassEntity,
  entity?: EntityRegistryDisplayEntry,
  state?: string
) => string;

export const computeFormatState = async (
  localize: LocalizeFunc,
  locale: FrontendLocaleData,
  config: HassConfig
): Promise<FormatStateFunc> => {
  const { computeStateDisplaySingleEntity } = await import(
    "../entity/compute_state_display"
  );

  return (stateObj, entity, state) =>
    computeStateDisplaySingleEntity(
      localize,
      stateObj,
      locale,
      config,
      entity,
      state
    );
};
