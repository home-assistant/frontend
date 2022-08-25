import {
  mdiAvTimer,
  mdiCalendar,
  mdiClockOutline,
  mdiCodeBraces,
  mdiDevices,
  mdiGestureDoubleTap,
  mdiHomeAssistant,
  mdiMapMarker,
  mdiMapMarkerRadius,
  mdiNfcVariant,
  mdiNumeric,
  mdiStateMachine,
  mdiSwapHorizontal,
  mdiWeatherSunny,
  mdiWebhook,
} from "@mdi/js";

export const TRIGGER_TYPES = {
  calendar: mdiCalendar,
  device: mdiDevices,
  event: mdiGestureDoubleTap,
  state: mdiStateMachine,
  geo_location: mdiMapMarker,
  homeassistant: mdiHomeAssistant,
  mqtt: mdiSwapHorizontal,
  numeric_state: mdiNumeric,
  sun: mdiWeatherSunny,
  tag: mdiNfcVariant,
  template: mdiCodeBraces,
  time: mdiClockOutline,
  time_pattern: mdiAvTimer,
  webhook: mdiWebhook,
  zone: mdiMapMarkerRadius,
};
