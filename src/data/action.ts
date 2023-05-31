import {
  mdiAbTesting,
  mdiApplicationVariableOutline,
  mdiArrowDecision,
  mdiCallSplit,
  mdiCodeBraces,
  mdiDevices,
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

export const ACTION_TYPES = {
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

export const YAML_ONLY_ACTION_TYPES = new Set<keyof typeof ACTION_TYPES>([
  "variables",
]);
