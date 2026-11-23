import type { MockTimerListTimer } from "../../../demo/src/stubs/timer_list";

export const TIMER_LIST_ENTITIES = [
  {
    entity_id: "timer_list.kitchen",
    state: "2",
    attributes: {
      friendly_name: "Kitchen timers",
      supported_features: 63,
    },
  },
  {
    entity_id: "timer_list.empty",
    state: "0",
    attributes: {
      friendly_name: "Empty timer list",
      supported_features: 63,
    },
  },
  {
    entity_id: "timer_list.read_only",
    state: "1",
    attributes: {
      friendly_name: "Read-only timers",
      supported_features: 0,
    },
  },
  {
    entity_id: "timer_list.unavailable",
    state: "unavailable",
    attributes: {
      friendly_name: "Unavailable timer list",
      supported_features: 63,
    },
  },
];

export const TIMER_LIST_TIMERS: Record<string, MockTimerListTimer[]> = {
  "timer_list.kitchen": [
    { name: "Eggs", duration: 360, finished: true },
    { name: "Pasta", duration: 600, remaining: 425 },
    { duration: 300, remaining: 40 },
    { name: "Bread", duration: 2700, remaining: 1310, paused: true },
  ],
  "timer_list.read_only": [
    { name: "Laundry", duration: 5400, remaining: 3725 },
  ],
};
