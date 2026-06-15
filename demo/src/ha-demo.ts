import { customElement } from "lit/decorators";
import { isNavigationClick } from "../../src/common/dom/is-navigation-click";
import { navigate } from "../../src/common/navigate";
import type { MockHomeAssistant } from "../../src/fake_data/provide_hass";
import { provideHass } from "../../src/fake_data/provide_hass";
import { HomeAssistantAppEl } from "../../src/layouts/home-assistant";
import type { HomeAssistant } from "../../src/types";
import { selectedDemoConfig } from "./configs/demo-configs";
import { mockApplicationCredentials } from "./stubs/application_credentials";
import { mockAreaRegistry } from "./stubs/area_registry";
import { mockAuth } from "./stubs/auth";
import { mockAutomation } from "./stubs/automation";
import { mockBackup } from "./stubs/backup";
import { mockBlueprint } from "./stubs/blueprint";
import { mockCloud } from "./stubs/cloud";
import { mockConfigEntries } from "./stubs/config_entries";
import { demoDevices } from "./stubs/devices";
import { mockDeviceRegistry } from "./stubs/device_registry";
import { mockEnergy } from "./stubs/energy";
import { energyEntities } from "./stubs/entities";
import { mockEntityRegistry } from "./stubs/entity_registry";
import { mockEntitySources } from "./stubs/entity_sources";
import { mockEvents } from "./stubs/events";
import { mockExpose } from "./stubs/expose";
import { mockFloorRegistry } from "./stubs/floor_registry";
import { mockFrontend } from "./stubs/frontend";
import { mockIntegration } from "./stubs/integration";
import { mockLabelRegistry } from "./stubs/label_registry";
import { mockIcons } from "./stubs/icons";
import { mockHistory } from "./stubs/history";
import { mockLovelace } from "./stubs/lovelace";
import { mockMediaPlayer } from "./stubs/media_player";
import { mockNetwork } from "./stubs/network";
import { mockPerson } from "./stubs/person";
import { mockPersistentNotification } from "./stubs/persistent_notification";
import { mockRecorder } from "./stubs/recorder";
import { mockSearch } from "./stubs/search";
import { mockSensor } from "./stubs/sensor";
import { mockSystemHealth } from "./stubs/system_health";
import { mockSystemLog } from "./stubs/system_log";
import { mockTags } from "./stubs/tags";
import { mockTemplate } from "./stubs/template";
import { mockTodo } from "./stubs/todo";
import { mockTranslations } from "./stubs/translations";
import { mockZone } from "./stubs/zone";

@customElement("ha-demo")
export class HaDemo extends HomeAssistantAppEl {
  protected async _initializeHass() {
    const initial: Partial<MockHomeAssistant> = {
      panelUrl: (this as any)._panelUrl,
      // Override updateHass so that the correct hass lifecycle methods are called
      updateHass: (hassUpdate: Partial<HomeAssistant>) =>
        this._updateHass(hassUpdate),
    };

    const hass = provideHass(this, initial, true);
    const localizePromise =
      // @ts-ignore
      this._loadFragmentTranslations(hass.language, "page-demo").then(
        () => this.hass!.localize
      );

    mockLovelace(hass, localizePromise);
    mockAuth(hass);
    mockTranslations(hass);
    mockHistory(hass);
    mockRecorder(hass);
    mockTodo(hass);
    mockSensor(hass);
    mockSystemLog(hass);
    mockTemplate(hass);
    mockEvents(hass);
    mockMediaPlayer(hass);
    mockFrontend(hass);
    mockIcons(hass);
    mockEnergy(hass);
    mockPersistentNotification(hass);
    mockCloud(hass);
    mockConfigEntries(hass);
    mockIntegration(hass);
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
    mockSearch(hass);
    mockTags(hass);
    mockAreaRegistry(hass);
    mockDeviceRegistry(hass, demoDevices);
    mockFloorRegistry(hass);
    mockLabelRegistry(hass);
    mockEntityRegistry(hass, [
      {
        config_entry_id: "co2signal",
        config_subentry_id: null,
        device_id: "co2signal",
        area_id: null,
        disabled_by: null,
        entity_id: "sensor.co2_intensity",
        id: "sensor.co2_intensity",
        name: null,
        icon: null,
        labels: [],
        categories: {},
        platform: "co2signal",
        hidden_by: null,
        entity_category: null,
        has_entity_name: false,
        unique_id: "co2_intensity",
        options: null,
        created_at: 0,
        modified_at: 0,
      },
      {
        config_entry_id: "co2signal",
        config_subentry_id: null,
        device_id: "co2signal",
        area_id: null,
        disabled_by: null,
        entity_id: "sensor.grid_fossil_fuel_percentage",
        id: "sensor.co2_intensity",
        name: null,
        icon: null,
        labels: [],
        categories: {},
        platform: "co2signal",
        hidden_by: null,
        entity_category: null,
        has_entity_name: false,
        unique_id: "grid_fossil_fuel_percentage",
        options: null,
        created_at: 0,
        modified_at: 0,
      },
    ]);

    hass.addEntities(energyEntities());

    // Once config is loaded AND localize, set entities and apply theme.
    Promise.all([selectedDemoConfig, localizePromise]).then(
      ([conf, localize]) => {
        hass.addEntities(conf.entities(localize));
        if (conf.theme) {
          hass.mockTheme(conf.theme());
        }
      }
    );

    // Taken from polymer/pwa-helpers. BSD-3 licensed
    document.body.addEventListener(
      "click",
      (e) => {
        const href = isNavigationClick(e);

        if (!href) {
          return;
        }

        e.preventDefault();
        navigate(href);
      },
      { capture: true }
    );

    (this as any).hassConnected();
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-demo": HaDemo;
  }
}
