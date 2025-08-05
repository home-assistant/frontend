import {
  mdiAbTesting,
  mdiApplicationVariableOutline,
  mdiArrowDecision,
  mdiBullhorn,
  mdiCallSplit,
  mdiCodeBraces,
  mdiDevices,
  mdiDotsHorizontal,
  mdiExcavator,
  mdiFormatListNumbered,
  mdiGestureDoubleTap,
  mdiHandBackRight,
  mdiPlay,
  mdiRefresh,
  mdiRoomService,
  mdiShuffleDisabled,
  mdiTimerOutline,
  mdiTools,
  mdiTrafficLight,
} from "@mdi/js";
import type { AutomationElementGroup } from "./automation";

export const ACTION_ICONS = {
  condition: mdiAbTesting,
  delay: mdiTimerOutline,
  event: mdiGestureDoubleTap,
  play_media: mdiPlay,
  service: mdiRoomService,
  wait_template: mdiCodeBraces,
  wait_for_trigger: mdiTrafficLight,
  repeat: mdiRefresh,
  repeat_count: mdiRefresh,
  repeat_while: mdiRefresh,
  repeat_until: mdiRefresh,
  repeat_for_each: mdiRefresh,
  choose: mdiArrowDecision,
  if: mdiCallSplit,
  device_id: mdiDevices,
  stop: mdiHandBackRight,
  sequence: mdiFormatListNumbered,
  parallel: mdiShuffleDisabled,
  variables: mdiApplicationVariableOutline,
  set_conversation_response: mdiBullhorn,
} as const;

export const YAML_ONLY_ACTION_TYPES = new Set<keyof typeof ACTION_ICONS>([
  "variables",
]);

export const ACTION_GROUPS: AutomationElementGroup = {
  device_id: {},
  helpers: {
    icon: mdiTools,
    members: {},
  },
  building_blocks: {
    icon: mdiExcavator,
    members: {
      condition: {},
      delay: {},
      wait_template: {},
      wait_for_trigger: {},
      repeat_count: {},
      repeat_while: {},
      repeat_until: {},
      repeat_for_each: {},
      choose: {},
      if: {},
      stop: {},
      sequence: {},
      parallel: {},
      variables: {},
    },
  },
  other: {
    icon: mdiDotsHorizontal,
    members: {
      event: {},
      service: {},
      set_conversation_response: {},
    },
  },
} as const;

export const SERVICE_PREFIX = "__SERVICE__";

export const isService = (key: string | undefined): boolean | undefined =>
  key?.startsWith(SERVICE_PREFIX);

export const getService = (key: string): string =>
  key.substring(SERVICE_PREFIX.length);
