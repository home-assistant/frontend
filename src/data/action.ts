import {
  mdiAbTesting,
  mdiApplicationVariableOutline,
  mdiArrowDecision,
  mdiBullhorn,
  mdiCallSplit,
  mdiCodeBraces,
  mdiDevices,
  mdiFormatListNumbered,
  mdiGestureDoubleTap,
  mdiHandBackRight,
  mdiPlay,
  mdiRefresh,
  mdiRoomService,
  mdiShuffleDisabled,
  mdiTimerOutline,
  mdiTrafficLight,
} from "@mdi/js";
import type { AutomationElementGroupCollection } from "./automation";
import type { Action } from "./script";

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

export const ACTION_COLLECTIONS: AutomationElementGroupCollection[] = [
  {
    groups: {
      device_id: {},
      dynamicGroups: {},
    },
  },
  {
    titleKey: "ui.panel.config.automation.editor.actions.groups.helpers.label",
    groups: {
      helpers: {},
    },
  },
  {
    titleKey: "ui.panel.config.automation.editor.actions.groups.other.label",
    groups: {
      event: {},
      service: {},
      set_conversation_response: {},
      other: {},
    },
  },
] as const;

export const ACTION_BUILDING_BLOCKS_GROUP = {
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
};

// These will be replaced with the correct action
export const VIRTUAL_ACTIONS: Partial<
  Record<keyof typeof ACTION_BUILDING_BLOCKS_GROUP, Action>
> = {
  repeat_count: {
    repeat: {
      count: 2,
      sequence: [],
    },
  },
  repeat_while: {
    repeat: {
      while: [],
      sequence: [],
    },
  },
  repeat_until: {
    repeat: {
      until: [],
      sequence: [],
    },
  },
  repeat_for_each: {
    repeat: {
      for_each: {},
      sequence: [],
    },
  },
} as const;

export const COLLAPSIBLE_ACTION_ELEMENTS = [
  "ha-automation-action-choose",
  "ha-automation-action-condition",
  "ha-automation-action-if",
  "ha-automation-action-parallel",
  "ha-automation-action-repeat",
  "ha-automation-action-sequence",
];

export const ACTION_BUILDING_BLOCKS = [
  "choose",
  "if",
  "parallel",
  "sequence",
  "repeat_while",
  "repeat_until",
];

// Building blocks that have options in the sidebar
export const ACTION_COMBINED_BLOCKS = [
  "repeat_count", // virtual repeat variant
  "repeat_for_each", // virtual repeat variant
  "wait_for_trigger",
];
