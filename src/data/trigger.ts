import {
  mdiAvTimer,
  mdiCalendar,
  mdiClockOutline,
  mdiCodeBraces,
  mdiDevices,
  mdiDotsHorizontal,
  mdiGestureDoubleTap,
  mdiMapClock,
  mdiMapMarker,
  mdiMapMarkerRadius,
  mdiMessageAlert,
  mdiMicrophoneMessage,
  mdiNfcVariant,
  mdiNumeric,
  mdiShape,
  mdiStateMachine,
  mdiSwapHorizontal,
  mdiTimerOutline,
  mdiWeatherSunny,
  mdiWebhook,
} from "@mdi/js";
import {
  object,
  optional,
  string,
  union,
  literal,
  boolean,
  is,
} from "superstruct";
import { mdiHomeAssistant } from "../resources/home-assistant-logo-svg";
import { AutomationElementGroup, Trigger } from "./automation";

export const TRIGGER_ICONS = {
  calendar: mdiCalendar,
  device: mdiDevices,
  event: mdiGestureDoubleTap,
  state: mdiStateMachine,
  geo_location: mdiMapMarker,
  homeassistant: mdiHomeAssistant,
  mqtt: mdiSwapHorizontal,
  numeric_state: mdiNumeric,
  sun: mdiWeatherSunny,
  conversation: mdiMicrophoneMessage,
  tag: mdiNfcVariant,
  template: mdiCodeBraces,
  time: mdiClockOutline,
  timer: mdiTimerOutline,
  time_pattern: mdiAvTimer,
  webhook: mdiWebhook,
  persistent_notification: mdiMessageAlert,
  zone: mdiMapMarkerRadius,
};

export const TRIGGER_GROUPS: AutomationElementGroup = {
  device: {},
  entity: { icon: mdiShape, members: { state: {}, numeric_state: {} } },
  time_location: {
    icon: mdiMapClock,
    members: { calendar: {}, sun: {}, time: {}, time_pattern: {}, zone: {} },
  },
  other: {
    icon: mdiDotsHorizontal,
    members: {
      event: {},
      geo_location: {},
      homeassistant: {},
      mqtt: {},
      conversation: {},
      tag: {},
      timer: {},
      template: {},
      webhook: {},
      persistent_notification: {},
    },
  },
} as const;

const timerEventTypeStruct = union([
  literal("timer.cancelled"),
  literal("timer.finished"),
  literal("timer.started"),
  literal("timer.restarted"),
  literal("timer.paused"),
]);

const timerEventTriggerStruct = object({
  alias: optional(string()),
  id: optional(string()),
  variables: optional(object()),
  enabled: optional(boolean()),
  platform: literal("event"),
  metadata: object(),
  event_type: optional(timerEventTypeStruct),
  event_data: object({
    entity_id: optional(string()),
  }),
});

export const getTriggerType = (trigger: Trigger): string => {
  if (is(trigger, timerEventTriggerStruct)) return "timer";

  return trigger.platform;
};
