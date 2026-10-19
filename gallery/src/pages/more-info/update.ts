import type { PropertyValues, TemplateResult } from "lit";
import { html, LitElement } from "lit";
import { customElement, property, query } from "lit/decorators";
import "../../../../src/components/ha-card";
import "../../../../src/dialogs/more-info/more-info-content";
import type { MockHomeAssistant } from "../../../../src/fake_data/provide_hass";
import { provideHass } from "../../../../src/fake_data/provide_hass";
import "../../components/demo-more-infos";
import { LONG_TEXT } from "../../data/text";
import { UpdateEntityFeature } from "../../../../src/data/update";

const base_attributes = {
  title: "Awesome",
  installed_version: "1.2.2",
  latest_version: "1.2.3",
  release_url: "https://home-assistant.io",
  supported_features: UpdateEntityFeature.INSTALL,
  skipped_version: null,
  in_progress: false,
  release_summary:
    "Lorem ipsum dolor sit amet, consectetur adipiscing elit. In nec metus aliquet, porta mi ut, ultrices odio. Etiam egestas orci tellus, non semper metus blandit tincidunt. Praesent elementum turpis vel tempor pharetra. Sed quis cursus diam. Proin sem justo.",
};

const ENTITIES = [
  {
    entity_id: "update.update1",
    state: "on",
    attributes: {
      ...base_attributes,
      friendly_name: "Update",
    },
  },
  {
    entity_id: "update.update2",
    state: "on",
    attributes: {
      ...base_attributes,
      title: null,
      friendly_name: "Update without title",
    },
  },
  {
    entity_id: "update.update3",
    state: "on",
    attributes: {
      ...base_attributes,
      release_url: null,
      friendly_name: "Update without release_url",
    },
  },
  {
    entity_id: "update.update4",
    state: "on",
    attributes: {
      ...base_attributes,
      release_summary: null,
      friendly_name: "Update without release_summary",
    },
  },
  {
    entity_id: "update.update5",
    state: "off",
    attributes: {
      ...base_attributes,
      installed_version: "1.2.3",
      friendly_name: "No update",
    },
  },
  {
    entity_id: "update.update6",
    state: "off",
    attributes: {
      ...base_attributes,
      skipped_version: "1.2.3",
      friendly_name: "Skipped version",
    },
  },
  {
    entity_id: "update.update7",
    state: "on",
    attributes: {
      ...base_attributes,
      supported_features:
        base_attributes.supported_features + UpdateEntityFeature.BACKUP,
      friendly_name: "With backup support",
    },
  },
  {
    entity_id: "update.update8",
    state: "on",
    attributes: {
      ...base_attributes,
      in_progress: true,
      friendly_name: "With true in_progress",
    },
  },
  {
    entity_id: "update.update9",
    state: "on",
    attributes: {
      ...base_attributes,
      in_progress: 25,
      supported_features:
        base_attributes.supported_features + UpdateEntityFeature.PROGRESS,
      friendly_name: "With 25 in_progress",
    },
  },
  {
    entity_id: "update.update10",
    state: "on",
    attributes: {
      ...base_attributes,
      in_progress: 50,
      supported_features:
        base_attributes.supported_features + UpdateEntityFeature.PROGRESS,
      friendly_name: "With 50 in_progress",
    },
  },
  {
    entity_id: "update.update11",
    state: "on",
    attributes: {
      ...base_attributes,
      in_progress: 75,
      supported_features:
        base_attributes.supported_features + UpdateEntityFeature.PROGRESS,
      friendly_name: "With 75 in_progress",
    },
  },
  {
    entity_id: "update.update12",
    state: "unavailable",
    attributes: {
      ...base_attributes,
      in_progress: 50,
      friendly_name: "Unavailable",
    },
  },
  {
    entity_id: "update.update13",
    state: "on",
    attributes: {
      ...base_attributes,
      supported_features: 0,
      friendly_name: "No install support",
    },
  },
  {
    entity_id: "update.update14",
    state: "off",
    attributes: {
      ...base_attributes,
      installed_version: null,
      friendly_name: "Update without installed_version",
    },
  },
  {
    entity_id: "update.update15",
    state: "off",
    attributes: {
      ...base_attributes,
      latest_version: null,
      friendly_name: "Update without latest_version",
    },
  },
  {
    entity_id: "update.update16",
    state: "off",
    attributes: {
      ...base_attributes,
      friendly_name: "Update with release notes",
      supported_features:
        base_attributes.supported_features + UpdateEntityFeature.RELEASE_NOTES,
    },
  },
  {
    entity_id: "update.update17",
    state: "off",
    attributes: {
      ...base_attributes,
      friendly_name: "Update with release notes error",
      supported_features:
        base_attributes.supported_features + UpdateEntityFeature.RELEASE_NOTES,
    },
  },
  {
    entity_id: "update.update18",
    state: "off",
    attributes: {
      ...base_attributes,
      friendly_name: "Update with release notes loading",
      supported_features:
        base_attributes.supported_features + UpdateEntityFeature.RELEASE_NOTES,
    },
  },
  {
    entity_id: "update.update19",
    state: "on",
    attributes: {
      ...base_attributes,
      friendly_name: "Update with auto update",
      auto_update: true,
    },
  },
  {
    entity_id: "update.update20",
    state: "on",
    attributes: {
      ...base_attributes,
      in_progress: true,
      title: undefined,
      friendly_name: "Installing without title",
    },
  },
  {
    entity_id: "update.update21",
    state: "on",
    attributes: {
      ...base_attributes,
      in_progress: true,
      friendly_name:
        "Update with in_progress true and  UpdateEntityFeature.PROGRESS",
      supported_features:
        base_attributes.supported_features + UpdateEntityFeature.PROGRESS,
    },
  },
  {
    entity_id: "update.update22",
    state: "on",
    attributes: {
      ...base_attributes,
      friendly_name: "Update that fails to install",
    },
  },
  {
    entity_id: "update.update23",
    platform: "hassio",
    state: "on",
    attributes: {
      ...base_attributes,
      title: "Mosquitto",
      installed_version: "7.1.1",
      latest_version: "7.1.9",
      friendly_name: "App update that fails to install",
    },
  },
];

const FAILING_UPDATES = {
  "update.update22": "Could not download the firmware: connection timed out",
  "update.update23":
    "Error updating Mosquitto: An unknown error occurred with app core_mosquitto. Check Supervisor logs for details",
};

const SUPERVISOR_LOG = [
  "2026-10-19 10:50:59.454 ERROR (MainThread) [supervisor.resolution.check] Check of unhealthy system failed",
  "2026-10-19 10:53:48.226 INFO (MainThread) [supervisor.docker.app] Updating image homeassistant/amd64-addon-mosquitto:7.1.1 to homeassistant/amd64-addon-mosquitto:7.1.9",
  "2026-10-19 10:53:48.828 WARNING (MainThread) [supervisor.docker.manifest] Failed to fetch manifest for docker.io/homeassistant/amd64-addon-mosquitto:7.1.9 - 404",
  "2026-10-19 10:53:48.828 INFO (MainThread) [supervisor.docker.interface] Downloading docker image homeassistant/amd64-addon-mosquitto with tag 7.1.9.",
  `2026-10-19 10:53:49.364 ERROR (MainThread) [supervisor.docker.interface] Can't install homeassistant/amd64-addon-mosquitto:7.1.9: [404] failed to resolve reference "docker.io/homeassistant/amd64-addon-mosquitto:7.1.9": not found`,
  "2026-10-19 10:53:49.364 ERROR (MainThread) [supervisor.apps.app] Could not pull image to update app core_mosquitto: Can't install homeassistant/amd64-addon-mosquitto:7.1.9",
  "2026-10-19 10:53:49.365 WARNING (MainThread) [supervisor.jobs] Background job app_manager_update failed: An unknown error occurred with app core_mosquitto. Check Supervisor logs for details",
  "",
].join("\n");

@customElement("demo-more-info-update")
class DemoMoreInfoUpdate extends LitElement {
  @property({ attribute: false }) public hass!: MockHomeAssistant;

  @query("demo-more-infos") private _demoRoot!: HTMLElement;

  protected render(): TemplateResult {
    return html`
      <demo-more-infos
        .hass=${this.hass}
        .entities=${ENTITIES.map((ent) => ent.entity_id)}
      ></demo-more-infos>
    `;
  }

  protected firstUpdated(changedProperties: PropertyValues<this>) {
    super.firstUpdated(changedProperties);
    const hass = provideHass(this._demoRoot);
    hass.updateTranslations(null, "en");
    hass.addEntities(ENTITIES);
    hass.mockWS(
      "update/release_notes",
      (msg: { type: string; entity_id: string }) => {
        if (msg.entity_id === "update.update16") {
          return LONG_TEXT;
        }
        if (msg.entity_id === "update.update17") {
          return Promise.reject({
            code: "error",
            message: "Could not fetch release notes",
          });
        }
        if (msg.entity_id === "update.update18") {
          return undefined;
        }
        return null;
      }
    );
    hass.mockService("update", "install", async (data) => {
      const error = FAILING_UPDATES[data?.entity_id];
      if (error) {
        await new Promise((resolve) => {
          setTimeout(resolve, 1500);
        });
        throw { code: "home_assistant_error", message: error };
      }
    });
    hass.mockAPI("hassio/supervisor/logs?no_colors", () => SUPERVISOR_LOG);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "demo-more-info-update": DemoMoreInfoUpdate;
  }
}
