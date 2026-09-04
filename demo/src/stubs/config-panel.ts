import type { MockHomeAssistant } from "../../../src/fake_data/provide_hass";
import { mockApplicationCredentials } from "./application_credentials";
import { mockAssist } from "./assist";
import { mockAutomation } from "./automation";
import { mockBackup } from "./backup";
import { mockBlueprint } from "./blueprint";
import { mockCloud } from "./cloud";
import { mockConfig } from "./config";
import { mockConfigEntries } from "./config_entries";
import { mockDeviceAutomation } from "./device_automation";
import { mockEntityRegistrySettings } from "./entity_registry_settings";
import { mockEntitySources } from "./entity_sources";
import { mockExpose } from "./expose";
import { mockNetwork } from "./network";
import { mockPerson } from "./person";
import { mockScene } from "./scene";
import { mockSearch } from "./search";
import { mockSlugify } from "./slugify";
import { mockSystemHealth } from "./system_health";
import { mockTags } from "./tags";
import { mockZone } from "./zone";

// Registers every mock that is only needed once the config panel is opened.
// This module is dynamically imported so its data stays out of the main bundle.
export const mockConfigPanel = (hass: MockHomeAssistant) => {
  mockCloud(hass);
  mockConfig(hass);
  mockConfigEntries(hass);
  mockDeviceAutomation(hass);
  mockEntitySources(hass);
  mockBlueprint(hass);
  mockExpose(hass);
  mockZone(hass);
  mockPerson(hass);
  mockNetwork(hass);
  mockApplicationCredentials(hass);
  mockSystemHealth(hass);
  mockBackup(hass);
  mockAutomation(hass);
  mockScene(hass);
  mockSearch(hass);
  mockTags(hass);
  mockAssist(hass);
  mockEntityRegistrySettings(hass);
  mockSlugify(hass);
  hass.mockWS("llm/api/list", () => ({
    apis: [
      { id: "assist", name: "Assist" },
      { id: "music_assistant", name: "Music Assistant" },
    ],
  }));
};
