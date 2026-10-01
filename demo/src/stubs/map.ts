import type { EntityRegistryEntry } from "../../../src/data/entity/entity_registry";
import type { EntityHistoryState } from "../../../src/data/history";
import type { Zone } from "../../../src/data/zone";
import { demoConfig } from "../../../src/fake_data/demo_config";
import type { EntityInput } from "../../../src/fake_data/entities/types";
import type { MockHomeAssistant } from "../../../src/fake_data/provide_hass";

const HOUR = 3600 * 1000;

type ZoneData = Omit<Zone, "id">;

const HOME: ZoneData = {
  name: "Home",
  icon: "mdi:home",
  latitude: demoConfig.latitude,
  longitude: demoConfig.longitude,
  radius: 100,
  passive: false,
};

export const zones: Zone[] = [
  {
    id: "gym",
    name: "Gym",
    icon: "mdi:dumbbell",
    latitude: 52.358,
    longitude: 4.8686,
    radius: 150,
    passive: false,
  },
  {
    id: "school",
    name: "School",
    icon: "mdi:school",
    latitude: 52.3558182,
    longitude: 4.9535376,
    radius: 250,
    passive: false,
  },
  {
    id: "supermarket",
    name: "Supermarket",
    icon: "mdi:cart",
    latitude: 52.3793,
    longitude: 4.8994,
    radius: 100,
    passive: false,
  },
  {
    id: "work",
    name: "Work",
    icon: "mdi:briefcase",
    latitude: 52.3909184,
    longitude: 4.8530821,
    radius: 200,
    passive: false,
  },
];

interface DemoPerson {
  id: string;
  name: string;
  picture: string;
  latitude: number;
  longitude: number;
  // Hours ago and the state entered then, oldest first. The first entry is
  // the state before the 24 hour activity window, the last one the current
  // state.
  timeline: [number, string][];
}

const PEOPLE: DemoPerson[] = [
  {
    id: "arsaboo",
    name: "Arsaboo",
    picture: "/assets/arsaboo/images/arsaboo.jpg",
    latitude: 52.3732,
    longitude: 4.8904,
    timeline: [
      [30, "home"],
      [10, "not_home"],
      [9.5, "Work"],
      [5, "not_home"],
      [4.6, "Gym"],
      [3.4, "not_home"],
      [3.1, "Supermarket"],
      [2.8, "not_home"],
      [2.4, "home"],
    ],
  },
  {
    id: "melody",
    name: "Melody",
    picture: "/assets/arsaboo/images/melody.jpg",
    latitude: 52.373,
    longitude: 4.8901,
    timeline: [
      [30, "home"],
      [9, "not_home"],
      [8.6, "School"],
      [4, "not_home"],
      [3.6, "home"],
    ],
  },
  {
    id: "oscar",
    name: "Oscar",
    picture: "/assets/kernehed/oscar.jpg",
    latitude: 52.391,
    longitude: 4.8532,
    timeline: [
      [30, "home"],
      [9, "not_home"],
      [8.7, "Work"],
      [4.5, "not_home"],
      [4.2, "Supermarket"],
      [3.8, "not_home"],
      [3.5, "Work"],
    ],
  },
  {
    id: "bella",
    name: "Bella",
    picture: "/assets/kernehed/bella.jpg",
    latitude: 52.365,
    longitude: 4.8795,
    timeline: [
      [30, "home"],
      [8, "not_home"],
      [7.6, "Work"],
      [1.2, "not_home"],
      [0.9, "Gym"],
      [0.3, "not_home"],
    ],
  },
];

const CAR: EntityInput = {
  entity_id: "device_tracker.car",
  state: "not_home",
  attributes: {
    friendly_name: "Car",
    icon: "mdi:car",
    source_type: "gps",
    latitude: 52.3805,
    longitude: 4.8718,
    gps_accuracy: 10,
  },
};

const lastMove = (person: DemoPerson) =>
  person.timeline[person.timeline.length - 1];

const zoneEntity = (entityId: string, zone: ZoneData): EntityInput => {
  // A person's state is "home" for the home zone, the zone name otherwise
  const personState = entityId === "zone.home" ? "home" : zone.name;
  const persons = PEOPLE.filter(
    (person) => lastMove(person)[1] === personState
  ).map((person) => `person.${person.id}`);
  return {
    entity_id: entityId,
    state: String(persons.length),
    attributes: {
      latitude: zone.latitude,
      longitude: zone.longitude,
      radius: zone.radius,
      passive: zone.passive,
      persons,
      editable: true,
      icon: zone.icon,
      friendly_name: zone.name,
    },
  };
};

export const zoneEntities = (): EntityInput[] => [
  zoneEntity("zone.home", HOME),
  ...zones.map((zone) => zoneEntity(`zone.${zone.id}`, zone)),
];

// UI zones are in the entity registry, so the zone editor does not also list
// them as YAML zones
export const zoneRegistryEntries: EntityRegistryEntry[] = zones.map((zone) => ({
  config_entry_id: null,
  config_subentry_id: null,
  device_id: null,
  area_id: null,
  disabled_by: null,
  entity_id: `zone.${zone.id}`,
  id: `zone.${zone.id}`,
  name: null,
  icon: null,
  labels: [],
  categories: {},
  platform: "zone",
  hidden_by: null,
  entity_category: null,
  has_entity_name: false,
  unique_id: zone.id,
  options: null,
  created_at: 0,
  modified_at: 0,
}));

const personEntity = (person: DemoPerson, now: number): EntityInput => {
  const [hoursAgo, state] = lastMove(person);
  return {
    entity_id: `person.${person.id}`,
    state,
    last_changed: new Date(now - hoursAgo * HOUR).toISOString(),
    attributes: {
      friendly_name: person.name,
      entity_picture: person.picture,
      latitude: person.latitude,
      longitude: person.longitude,
      gps_accuracy: 20,
    },
  };
};

const personHistory = (person: DemoPerson, now: number): EntityHistoryState[] =>
  person.timeline.map(([hoursAgo, state]) => {
    const time = (now - hoursAgo * HOUR) / 1000;
    return { s: state, a: {}, lu: time, lc: time };
  });

export const mockMap = (hass: MockHomeAssistant) => {
  const now = Date.now();
  hass.addEntities([
    ...zoneEntities(),
    ...PEOPLE.map((person) => personEntity(person, now)),
    CAR,
  ]);
  hass.mockWS(
    "history/history_during_period",
    ({ entity_ids }: { entity_ids?: string[] }) =>
      Object.fromEntries(
        PEOPLE.filter(
          (person) => !entity_ids || entity_ids.includes(`person.${person.id}`)
        ).map((person) => [`person.${person.id}`, personHistory(person, now)])
      )
  );
};
