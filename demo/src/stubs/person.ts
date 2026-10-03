import type { Person } from "../../../src/data/person";
import type { MockHomeAssistant } from "../../../src/fake_data/provide_hass";

const storage: Person[] = [
  {
    id: "demo_user",
    name: "Demo User",
    user_id: "abcd",
    device_trackers: [],
  },
  {
    id: "anne_therese",
    name: "Anne Therese",
    device_trackers: [],
  },
];

export const mockPerson = (hass: MockHomeAssistant) => {
  hass.mockWS("person/list", () => ({ storage, config: [] as Person[] }));
};
