import type { LocalizeFunc } from "../../common/translations/localize";

export const NO_STATE_CLASS = "none";

export const computeStateClassName = (
  localize: LocalizeFunc,
  stateClass: string
): string =>
  localize(
    `component.sensor.entity_component._.state_attributes.state_class.state.${stateClass}`
  ) || stateClass;
