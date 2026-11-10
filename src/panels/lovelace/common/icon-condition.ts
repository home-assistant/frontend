import {
  mdiAccount,
  mdiAmpersand,
  mdiCalendarClock,
  mdiCodeBraces,
  mdiDevices,
  mdiGateOr,
  mdiMapMarker,
  mdiMapMarkerRadius,
  mdiNotEqualVariant,
  mdiNumeric,
  mdiResponsive,
  mdiStateMachine,
  mdiViewColumnOutline,
  mdiWeatherSunny,
} from "@mdi/js";

// Keyed by the condition `condition` string. Covers the client-only lovelace
// types, the logical combinators, and the core-format server types edited via
// the automation condition editors (template/sun/zone/device).
export const ICON_CONDITION: Record<string, string> = {
  view_columns: mdiViewColumnOutline,
  location: mdiMapMarker,
  numeric_state: mdiNumeric,
  state: mdiStateMachine,
  screen: mdiResponsive,
  time: mdiCalendarClock,
  user: mdiAccount,
  and: mdiAmpersand,
  not: mdiNotEqualVariant,
  or: mdiGateOr,
  template: mdiCodeBraces,
  sun: mdiWeatherSunny,
  zone: mdiMapMarkerRadius,
  device: mdiDevices,
};
