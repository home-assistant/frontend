import {
  mdiAbTesting,
  mdiApplicationVariableOutline,
  mdiArrowDecision,
  mdiCallSplit,
  mdiCodeBraces,
  mdiDevices,
  mdiDotsHorizontal,
  mdiExcavator,
  mdiGestureDoubleTap,
  mdiHandBackRight,
  mdiPalette,
  mdiPlay,
  mdiRefresh,
  mdiRoomService,
  mdiShuffleDisabled,
  mdiTimerOutline,
  mdiTools,
  mdiTrafficLight,
} from "@mdi/js";
import { AutomationElementGroup } from "./automation";

export const ACTION_ICONS = {
  condition: mdiAbTesting,
  delay: mdiTimerOutline,
  event: mdiGestureDoubleTap,
  play_media: mdiPlay,
  activate_scene: mdiPalette,
  service: mdiRoomService,
  wait_template: mdiCodeBraces,
  wait_for_trigger: mdiTrafficLight,
  repeat: mdiRefresh,
  choose: mdiArrowDecision,
  if: mdiCallSplit,
  device_id: mdiDevices,
  stop: mdiHandBackRight,
  parallel: mdiShuffleDisabled,
  variables: mdiApplicationVariableOutline,
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
      repeat: {},
      choose: {},
      if: {},
      stop: {},
      parallel: {},
      variables: {},
    },
  },
  other: {
    icon: mdiDotsHorizontal,
    members: {
      event: {},
      service: {},
    },
  },
} as const;

export const SERVICE_PREFIX = "__SERVICE__";

export const isService = (key: string | undefined): boolean | undefined =>
  key?.startsWith(SERVICE_PREFIX);

export const getService = (key: string): string =>
  key.substring(SERVICE_PREFIX.length);
