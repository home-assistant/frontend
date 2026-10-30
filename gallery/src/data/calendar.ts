import { mockEntityRegistry } from "../../../demo/src/stubs/entity_registry";
import type { CalendarEventApiData } from "../../../src/data/calendar";
import { CalendarEntityFeature } from "../../../src/data/calendar";
import type { EntityRegistryEntry } from "../../../src/data/entity/entity_registry";
import type { MockHomeAssistant } from "../../../src/fake_data/provide_hass";

// Sample calendars with events relative to today, so demos always show
// something in the current week and month.

const pad = (value: number) => String(value).padStart(2, "0");

const day = (offset: number): Date => {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + offset);
  return date;
};

const isoDate = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const at = (offset: number, hours: number, minutes = 0) => {
  const date = day(offset);
  date.setHours(hours, minutes);
  return date.toISOString();
};

const allDay = (offset: number, days = 1) => ({
  start: isoDate(day(offset)),
  end: isoDate(day(offset + days)),
  all_day: true,
});

const FAMILY_EVENTS: CalendarEventApiData[] = [
  { summary: "School run", start: at(0, 8), end: at(0, 8, 30) },
  {
    summary: "Dentist",
    start: at(0, 15, 30),
    end: at(0, 16, 15),
    location: "Main Street 12",
  },
  { summary: "Grandma's birthday", ...allDay(1) },
  { summary: "Football practice", start: at(2, 17), end: at(2, 18, 30) },
  {
    summary: "Dinner with friends",
    start: at(3, 19),
    end: at(3, 22),
    status: "tentative",
  },
  { summary: "Summer cabin", ...allDay(5, 3) },
  { summary: "Parent-teacher meeting", start: at(9, 18), end: at(9, 19) },
  { summary: "Football practice", start: at(9, 17), end: at(9, 18, 30) },
  { summary: "Swimming lessons", start: at(12, 10), end: at(12, 11) },
  { summary: "Car service", start: at(-3, 9), end: at(-3, 11) },
  { summary: "Book club", start: at(-6, 19), end: at(-6, 21) },
];

const WORK_EVENTS: CalendarEventApiData[] = [
  { summary: "Stand-up", start: at(0, 9), end: at(0, 9, 15) },
  { summary: "Sprint planning", start: at(2, 10), end: at(2, 12) },
  { summary: "Team lunch", start: at(4, 12), end: at(4, 13) },
  { summary: "Conference", ...allDay(8, 2) },
  { summary: "Quarterly review", start: at(-2, 14), end: at(-2, 15, 30) },
];

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
      start_time: at(0, 8),
      end_time: at(0, 8, 30),
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
      start_time: at(0, 9),
      end_time: at(0, 9, 15),
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
  hass.mockWS("calendar/event/subscribe", (msg, _hass, onChange) => {
    const start = new Date(msg.start).getTime();
    const end = new Date(msg.end).getTime();
    const events = EVENTS[msg.entity_id];
    onChange?.({
      events:
        events?.filter(
          (event) =>
            new Date(event.end as string).getTime() > start &&
            new Date(event.start as string).getTime() < end
        ) ?? null,
    });
    return () => undefined;
  });
  // Changes made in the event dialogs are accepted but not stored
  hass.mockWS("calendar/event/create", () => null);
  hass.mockWS("calendar/event/update", () => null);
  hass.mockWS("calendar/event/delete", () => null);
};
