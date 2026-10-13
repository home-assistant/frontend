import type { MockHomeAssistant } from "../../../src/fake_data/provide_hass";
import { zoneEntities, zones } from "./map";

export const mockZone = (hass: MockHomeAssistant) => {
  hass.mockWS("zone/list", () => zones);
  hass.addEntities(zoneEntities());
};
