import { customElement } from "lit/decorators";
import { isNavigationClick } from "../../../../src/common/dom/is-navigation-click";
import { navigate } from "../../../../src/common/navigate";
import type { MockHomeAssistant } from "../../../../src/fake_data/provide_hass";
import { provideHass } from "../../../../src/fake_data/provide_hass";
import { HomeAssistantAppEl } from "../../../../src/layouts/home-assistant";
import type { HomeAssistant } from "../../../../src/types";
import { demoSections } from "../../../../demo/src/configs/sections";
import { mockAreaRegistry } from "../../../../demo/src/stubs/area_registry";
import { mockAssist } from "../../../../demo/src/stubs/assist";
import { mockAuth } from "../../../../demo/src/stubs/auth";
import { mockCloud } from "../../../../demo/src/stubs/cloud";
import { mockConfigEntries } from "../../../../demo/src/stubs/config_entries";
import { mockDeviceRegistry } from "../../../../demo/src/stubs/device_registry";
import { mockEnergy } from "../../../../demo/src/stubs/energy";
import { energyEntities } from "../../../../demo/src/stubs/entities";
import { mockEntityRegistry } from "../../../../demo/src/stubs/entity_registry";
import { mockEvents } from "../../../../demo/src/stubs/events";
import { mockFloorRegistry } from "../../../../demo/src/stubs/floor_registry";
import { mockFrontend } from "../../../../demo/src/stubs/frontend";
import { mockHistory } from "../../../../demo/src/stubs/history";
import { mockIcons } from "../../../../demo/src/stubs/icons";
import { mockLabelRegistry } from "../../../../demo/src/stubs/label_registry";
import { mockLovelace } from "../../../../demo/src/stubs/lovelace";
import { mockMediaPlayer } from "../../../../demo/src/stubs/media_player";
import { mockPersistentNotification } from "../../../../demo/src/stubs/persistent_notification";
import { mockRecorder } from "../../../../demo/src/stubs/recorder";
import { mockSensor } from "../../../../demo/src/stubs/sensor";
import { mockSystemLog } from "../../../../demo/src/stubs/system_log";
import { mockTemplate } from "../../../../demo/src/stubs/template";
import { mockTodo } from "../../../../demo/src/stubs/todo";
import { mockTranslations } from "../../../../demo/src/stubs/translations";
import { mockUpdate } from "../../../../demo/src/stubs/update";
import { e2eTestPanels } from "./ha-test-panels";
import { scenarios } from "./scenarios";

declare global {
  interface Window {
    __mockHass: MockHomeAssistant;
  }
}

@customElement("ha-test")
export class HaTest extends HomeAssistantAppEl {
  protected async _initializeHass() {
    const scenarioName =
      new URLSearchParams(window.location.search).get("scenario") ?? "default";
    const scenario = Object.prototype.hasOwnProperty.call(
      scenarios,
      scenarioName
    )
      ? scenarios[scenarioName as keyof typeof scenarios]
      : scenarios.default;

    const initial: Partial<MockHomeAssistant> = {
      // Use the full panel map (history + config + developer-tools enabled)
      panels: e2eTestPanels,
      panelUrl: (() => {
        const path = window.location.pathname;
        const dividerPos = path.indexOf("/", 1);
        return dividerPos === -1
          ? path.substring(1)
          : path.substring(1, dividerPos);
      })(),
      updateHass: (hassUpdate: Partial<HomeAssistant>) =>
        this._updateHass(hassUpdate),
    };

    const hass = provideHass(this, initial, true);
    const localizePromise =
      // @ts-ignore
      this._loadFragmentTranslations(hass.language, "page-demo").then(
        () => this.hass!.localize
      );

    // Register all stubs
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
    mockEnergy(hass);
    mockUpdate(hass);
    mockCloud(hass);
    mockAssist(hass);
    mockAreaRegistry(hass);
    mockDeviceRegistry(hass);
    mockFloorRegistry(hass);
    mockLabelRegistry(hass);
    mockEntityRegistry(hass, []);
    mockConfigEntries(hass);
    mockIcons(hass);
    mockPersistentNotification(hass);

    // Load default entities from the sections config
    hass.addEntities(energyEntities());
    Promise.all([Promise.resolve(demoSections), localizePromise]).then(
      ([conf, localize]) => {
        hass.addEntities(conf.entities(localize));
      }
    );

    // Apply scenario customisations (may add entities, change user, set theme,
    // navigate to a panel, etc.)
    await scenario(hass);

    // Expose mock handle for Playwright tests to call imperatively
    window.__mockHass = hass;

    // SPA navigation
    document.body.addEventListener(
      "click",
      (e) => {
        const href = isNavigationClick(e);
        if (!href) return;
        e.preventDefault();
        navigate(href);
      },
      { capture: true }
    );

    this.hassConnected();
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-test": HaTest;
  }
}
