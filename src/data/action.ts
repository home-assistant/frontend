import {
  mdiAbTesting,
  mdiApplicationVariableOutline,
  mdiArrowDecision,
  mdiCallSplit,
  mdiCodeBraces,
  mdiDevices,
  mdiDotsHorizontal,
  mdiGestureDoubleTap,
  mdiHandBackRight,
  mdiPalette,
  mdiPlay,
  mdiRefresh,
  mdiRoomService,
  mdiShuffleDisabled,
  mdiTimerOutline,
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
  play_media: {},
  activate_scene: {},
  other: {
    icon: mdiDotsHorizontal,
    members: {
      event: {},
    },
  },
} as const;

export const ACTION_BUILDING_BLOCKS_GROUPS: AutomationElementGroup = {
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
} as const;
