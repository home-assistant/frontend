import {
  mdiAmpersand,
  mdiCancel,
  mdiClockOutline,
  mdiCodeBraces,
  mdiDevices,
  mdiExclamation,
  mdiGateOr,
  mdiMapMarkerRadius,
  mdiNumeric,
  mdiStateMachine,
  mdiWeatherSunny,
} from "@mdi/js";

export const CONDITION_TYPES = {
  device: mdiDevices,
  and: mdiAmpersand,
  or: mdiGateOr,
  not: mdiCancel,
  state: mdiStateMachine,
  numeric_state: mdiNumeric,
  sun: mdiWeatherSunny,
  template: mdiCodeBraces,
  time: mdiClockOutline,
  trigger: mdiExclamation,
  zone: mdiMapMarkerRadius,
};
