import {
  mdiAmpersand,
  mdiClockOutline,
  mdiCodeBraces,
  mdiDevices,
  mdiGateOr,
  mdiIdentifier,
  mdiMapMarkerRadius,
  mdiNotEqualVariant,
  mdiNumeric,
  mdiStateMachine,
  mdiWeatherSunny,
} from "@mdi/js";

export const CONDITION_TYPES = {
  device: mdiDevices,
  and: mdiAmpersand,
  or: mdiGateOr,
  not: mdiNotEqualVariant,
  state: mdiStateMachine,
  numeric_state: mdiNumeric,
  sun: mdiWeatherSunny,
  template: mdiCodeBraces,
  time: mdiClockOutline,
  trigger: mdiIdentifier,
  zone: mdiMapMarkerRadius,
};
