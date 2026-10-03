import { ASSIST_ENTITIES } from "../../../../../common/const";
import type { EntityFilter } from "../../../../../common/entity/entity_filter";

export const OTHER_DEVICES_FILTERS: EntityFilter[] = [
  {
    area: null,
    hidden_platform: [
      "automation",
      "script",
      "hassio",
      "backup",
      "mobile_app",
      "zone",
      "person",
    ],
    hidden_domains: [
      "ai_task",
      "automation",
      "configurator",
      "device_tracker",
      "event",
      "geo_location",
      "notify",
      "persistent_notification",
      "script",
      "sun",
      "tag",
      "todo",
      "zone",
      ...ASSIST_ENTITIES,
    ],
  },
];
