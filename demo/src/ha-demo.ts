// Compat needs to be first import
import "../../src/resources/compatibility";
import { customElement } from "lit/decorators";
import { isNavigationClick } from "../../src/common/dom/is-navigation-click";
import { navigate } from "../../src/common/navigate";
import {
  MockHomeAssistant,
  provideHass,
} from "../../src/fake_data/provide_hass";
import { HomeAssistantAppEl } from "../../src/layouts/home-assistant";
import { HomeAssistant } from "../../src/types";
import { selectedDemoConfig } from "./configs/demo-configs";
import { mockAuth } from "./stubs/auth";
import { mockConfigEntries } from "./stubs/config_entries";
import { mockEnergy } from "./stubs/energy";
import { energyEntities } from "./stubs/entities";
import { mockEntityRegistry } from "./stubs/entity_registry";
import { mockEvents } from "./stubs/events";
import { mockFrontend } from "./stubs/frontend";
import { mockHistory } from "./stubs/history";
import { mockLovelace } from "./stubs/lovelace";
import { mockMediaPlayer } from "./stubs/media_player";
import { mockPersistentNotification } from "./stubs/persistent_notification";
import { mockRecorder } from "./stubs/recorder";
import { mockTodo } from "./stubs/todo";
import { mockSystemLog } from "./stubs/system_log";
import { mockTemplate } from "./stubs/template";
import { mockTranslations } from "./stubs/translations";

@customElement("ha-demo")
export class HaDemo extends HomeAssistantAppEl {
  protected async _initializeHass() {
    const initial: Partial<MockHomeAssistant> = {
      panelUrl: (this as any)._panelUrl,
      // Override updateHass so that the correct hass lifecycle methods are called
      updateHass: (hassUpdate: Partial<HomeAssistant>) =>
        this._updateHass(hassUpdate),
    };

    const hass = (this.hass = provideHass(this, initial));
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
    mockSystemLog(hass);
    mockTemplate(hass);
    mockEvents(hass);
    mockMediaPlayer(hass);
    mockFrontend(hass);
    mockEnergy(hass);
    mockPersistentNotification(hass);
    mockConfigEntries(hass);
    mockEntityRegistry(hass, [
      {
        config_entry_id: "co2signal",
        device_id: "co2signal",
        area_id: null,
        disabled_by: null,
        entity_id: "sensor.co2_intensity",
        id: "sensor.co2_intensity",
        name: null,
        icon: null,
        platform: "co2signal",
        hidden_by: null,
        entity_category: null,
        has_entity_name: false,
        unique_id: "co2_intensity",
        options: null,
      },
      {
        config_entry_id: "co2signal",
        device_id: "co2signal",
        area_id: null,
        disabled_by: null,
        entity_id: "sensor.grid_fossil_fuel_percentage",
        id: "sensor.co2_intensity",
        name: null,
        icon: null,
        platform: "co2signal",
        hidden_by: null,
        entity_category: null,
        has_entity_name: false,
        unique_id: "grid_fossil_fuel_percentage",
        options: null,
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
