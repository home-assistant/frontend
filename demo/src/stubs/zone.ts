import type { Zone } from "../../../src/data/zone";
import type { MockHomeAssistant } from "../../../src/fake_data/provide_hass";

const zones: Zone[] = [
  {
    id: "home",
    name: "Home",
    icon: "mdi:home",
    latitude: 52.3731339,
    longitude: 4.8903147,
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

export const mockZone = (hass: MockHomeAssistant) => {
  hass.mockWS("zone/list", () => zones);
};
