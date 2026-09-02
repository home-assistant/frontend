import { customElement } from "lit/decorators";
import { isNavigationClick } from "../../../../src/common/dom/is-navigation-click";
import { navigate } from "../../../../src/common/navigate";
import type { MockHomeAssistant } from "../../../../src/fake_data/provide_hass";
import type { LogbookStreamMessage } from "../../../../src/data/logbook";
import { provideHass } from "../../../../src/fake_data/provide_hass";
import { HomeAssistantAppEl } from "../../../../src/layouts/home-assistant";
import type { HomeAssistant } from "../../../../src/types";
import { demoSections } from "../../../../demo/src/configs/sections";
import { mockAreaRegistry } from "../../../../demo/src/stubs/area_registry";
import { mockAssist } from "../../../../demo/src/stubs/assist";
import { mockAuth } from "../../../../demo/src/stubs/auth";
import { mockCloud } from "../../../../demo/src/stubs/cloud";
import {
  demoConfigEntries,
  mockConfigEntries,
} from "../../../../demo/src/stubs/config_entries";
import { mockDeviceRegistry } from "../../../../demo/src/stubs/device_registry";
import { mockEnergy } from "../../../../demo/src/stubs/energy";
import { energyEntities } from "../../../../demo/src/stubs/entities";
import { mockEntityRegistry } from "../../../../demo/src/stubs/entity_registry";
import { mockEvents } from "../../../../demo/src/stubs/events";
import { mockFloorRegistry } from "../../../../demo/src/stubs/floor_registry";
import { mockFrontend } from "../../../../demo/src/stubs/frontend";
import { mockHistory } from "../../../../demo/src/stubs/history";
import { mockIcons } from "../../../../demo/src/stubs/icons";
import { mockIntegration } from "../../../../demo/src/stubs/integration";
import { mockHassioSupervisor } from "../../../../demo/src/stubs/hassio_supervisor";
import { mockLabelRegistry } from "../../../../demo/src/stubs/label_registry";
import { mockLovelace } from "../../../../demo/src/stubs/lovelace";
import { mockMediaPlayer } from "../../../../demo/src/stubs/media_player";
import { mockPersistentNotification } from "../../../../demo/src/stubs/persistent_notification";
import { mockRecorder } from "../../../../demo/src/stubs/recorder";
import { mockSearch } from "../../../../demo/src/stubs/search";
import { mockSensor } from "../../../../demo/src/stubs/sensor";
import { mockSystemLog } from "../../../../demo/src/stubs/system_log";
import { mockTemplate } from "../../../../demo/src/stubs/template";
import { mockTodo } from "../../../../demo/src/stubs/todo";
import { mockTranslations } from "../../../../demo/src/stubs/translations";
import { mockUpdate } from "../../../../demo/src/stubs/update";
import type { EntityRegistryDisplayEntry } from "../../../../src/data/entity/entity_registry";
import { demoConfig } from "../../../../src/fake_data/demo_config";
import { e2eTestPanels } from "./ha-test-panels";
import { scenarios } from "./scenarios";

const E2E_CONFIG_COMPONENTS = [
  ...demoConfig.components,
  "bluetooth",
  "dhcp",
  "hardware",
  "infrared",
  "insteon",
  "knx",
  "lovelace",
  "matter",
  "mqtt",
  "radio_frequency",
  "ssdp",
  "tag",
  "thread",
  "zeroconf",
  "zha",
  "zone",
  "zwave_js",
];

const E2E_FILTER_ENTITIES: Record<string, EntityRegistryDisplayEntry> = {
  "infrared.remote": {
    entity_id: "infrared.remote",
    labels: [],
    platform: "demo",
  },
  "radio_frequency.remote": {
    entity_id: "radio_frequency.remote",
    labels: [],
    platform: "demo",
  },
};

const MEDIA_BROWSER_ROOT = {
  title: "Media",
  media_content_id: "media-source://media_source",
  media_content_type: "app",
  media_class: "directory",
  can_play: false,
  can_expand: true,
  can_search: false,
  children: [],
};

declare global {
  interface Window {
    __assistRun?: unknown;
    __mockHass: MockHomeAssistant;
    rejectMediaBrowse?: () => void;
    resolveCalendarRegistry?: () => void;
    resolveConnectivityConfigEntries?: () => void;
    resolveConfigEntries?: () => void;
    resolveConfigEntriesInProgress?: () => void;
    resolveGeneratedDashboard?: () => void;
    resolveLovelaceConfig?: () => void;
    resolveMediaBrowse?: () => void;
    resolveSerialPorts?: () => void;
    resolveStorageHostInfo?: () => void;
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
      // Use the full panel map (history + config enabled)
      panels: e2eTestPanels,
      config: {
        ...demoConfig,
        // Include common protocol and discovery integrations so Settings shows
        // the same high-level panels most real Home Assistant instances expose.
        components: E2E_CONFIG_COMPONENTS,
      },
      entities: E2E_FILTER_ENTITIES,
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

    // `false` for contexts: HomeAssistantAppEl already provides them via
    // `contextMixin`, so let provideHass skip them to avoid duplicate providers.
    const hass = provideHass(this, initial, true, false);
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
    mockIntegration(hass);
    mockHassioSupervisor(hass);
    mockPersistentNotification(hass);
    mockSearch(hass);
    const { mockConfigPanel } =
      await import("../../../../demo/src/stubs/config-panel");
    mockConfigPanel(hass);

    hass.mockWS("config_entries/get", (msg: { domain?: string }) => {
      const protocolEntries = demoConfigEntries
        .map(({ entry }) => entry)
        .concat(
          [
            { entry_id: "mock-bluetooth", domain: "bluetooth" },
            { entry_id: "mock-lovelace", domain: "lovelace" },
          ].map((entry) => ({
            disabled_by: null,
            domain: entry.domain,
            entry_id: entry.entry_id,
            error_reason_translation_domain: null,
            error_reason_translation_key: null,
            error_reason_translation_placeholders: null,
            num_subentries: 0,
            pref_disable_new_entities: false,
            pref_disable_polling: false,
            reason: null,
            source: "user" as const,
            state: "loaded" as const,
            supported_subentry_types: {},
            supports_options: false,
            supports_reconfigure: false,
            supports_remove_device: false,
            supports_unload: true,
            title: entry.domain,
          }))
        );
      return protocolEntries.filter(
        (entry) => !msg.domain || entry.domain === msg.domain
      );
    });
    hass.mockWS("radio_frequency/list", () => ({ transmitters: [] }));
    hass.mockWS("calendar/event/subscribe", (_msg, _currentHass, onChange) => {
      onChange?.({ events: [] });
      return () => undefined;
    });
    hass.mockWS("logbook/event_stream", (_msg, _currentHass, onChange) => {
      const message: LogbookStreamMessage = { events: [] };
      onChange?.(message);
      return () => undefined;
    });
    hass.mockWS("config/auth/list", () => []);
    hass.mockWS("trace/contexts", () => ({}));
    hass.mockWS("media_source/browse_media", () => MEDIA_BROWSER_ROOT);

    // Load default entities from the sections config
    hass.addEntities([
      ...energyEntities(),
      {
        entity_id: "todo.shopping_list",
        state: "0",
        attributes: {
          friendly_name: "Shopping list",
          supported_features: 15,
        },
      },
    ]);
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
    window.addEventListener("click", (e) => {
      const href = isNavigationClick(e);
      if (href) {
        navigate(href);
      }
    });

    this.hassConnected();
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-test": HaTest;
  }
}
