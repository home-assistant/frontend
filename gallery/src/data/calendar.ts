import {
  FAMILY_EVENTS,
  mockCalendarEvents,
  WORK_EVENTS,
} from "../../../demo/src/stubs/calendar";
import { mockEntityRegistry } from "../../../demo/src/stubs/entity_registry";
import type { CalendarEventApiData } from "../../../src/data/calendar";
import { CalendarEntityFeature } from "../../../src/data/calendar";
import type { EntityRegistryEntry } from "../../../src/data/entity/entity_registry";
import type { MockHomeAssistant } from "../../../src/fake_data/provide_hass";

const EVENTS: Record<string, CalendarEventApiData[] | null> = {
  "calendar.family": FAMILY_EVENTS,
  "calendar.work": WORK_EVENTS,
  "calendar.empty": [],
  // A calendar whose integration fails to return events
  "calendar.holidays": null,
};

export const CALENDAR_ENTITIES = [
  {
    entity_id: "calendar.family",
    state: "off",
    attributes: {
      friendly_name: "Family",
      message: "School run",
      all_day: false,
      start_time: FAMILY_EVENTS[0].start,
      end_time: FAMILY_EVENTS[0].end,
      location: "",
      description: "",
      supported_features:
        CalendarEntityFeature.CREATE_EVENT +
        CalendarEntityFeature.DELETE_EVENT +
        CalendarEntityFeature.UPDATE_EVENT,
    },
  },
  {
    entity_id: "calendar.work",
    state: "off",
    attributes: {
      friendly_name: "Work",
      message: "Stand-up",
      all_day: false,
      start_time: WORK_EVENTS[0].start,
      end_time: WORK_EVENTS[0].end,
    },
  },
  {
    entity_id: "calendar.empty",
    state: "off",
    attributes: { friendly_name: "Empty calendar" },
  },
  {
    entity_id: "calendar.holidays",
    state: "off",
    attributes: { friendly_name: "Holidays (failing)" },
  },
];

const registryEntry = (
  entityId: string,
  color?: string
): EntityRegistryEntry => ({
  id: entityId,
  entity_id: entityId,
  name: null,
  icon: null,
  platform: "local_calendar",
  config_entry_id: null,
  config_subentry_id: null,
  device_id: null,
  area_id: null,
  labels: [],
  disabled_by: null,
  hidden_by: null,
  entity_category: null,
  has_entity_name: false,
  unique_id: entityId,
  options: color ? { calendar: { color } } : null,
  categories: {},
  created_at: 0,
  modified_at: 0,
});

export const mockCalendars = (hass: MockHomeAssistant) => {
  mockEntityRegistry(hass, [
    registryEntry("calendar.family"),
    // Shows a color picked in the entity settings
    registryEntry("calendar.work", "deep-orange"),
    registryEntry("calendar.empty"),
    registryEntry("calendar.holidays"),
  ]);
  mockCalendarEvents(hass, (entityId) => EVENTS[entityId]);
  // Changes made in the event dialogs are accepted but not stored
  hass.mockWS("calendar/event/create", () => null);
  hass.mockWS("calendar/event/update", () => null);
  hass.mockWS("calendar/event/delete", () => null);
};
