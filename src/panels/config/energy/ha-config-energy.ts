import "../../../layouts/hass-error-screen";
import {
  mdiDownload,
  mdiFire,
  mdiLightningBolt,
  mdiViewDashboardEdit,
  mdiWater,
} from "@mdi/js";
import type { CSSResultGroup, PropertyValues, TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { cache } from "lit/directives/cache";
import { navigate } from "../../../common/navigate";
import type {
  EnergyPreferencesValidation,
  EnergyInfo,
  EnergyPreferences,
} from "../../../data/energy";
import {
  getEnergyPreferenceValidation,
  getEnergyInfo,
  getEnergyPreferences,
  getReferencedStatisticIds,
} from "../../../data/energy";
import type { StatisticsMetaData } from "../../../data/recorder";
import { getStatisticMetadata } from "../../../data/recorder";
import "../../../layouts/hass-loading-screen";
import "../../../layouts/hass-tabs-subpage";
import { haStyle } from "../../../resources/styles";
import type { HomeAssistant, Route } from "../../../types";
import "../../../components/ha-alert";
import "./components/ha-energy-device-settings";
import "./components/ha-energy-device-settings-water";
import "./components/ha-energy-grid-settings";
import "./components/ha-energy-solar-settings";
import "./components/ha-energy-home-settings";
import "./components/ha-energy-battery-settings";
import "./components/ha-energy-gas-settings";
import "./components/ha-energy-water-settings";
import { fileDownload } from "../../../util/file_download";
import { showToast } from "../../../util/toast";
import type { PageNavigation } from "../../../layouts/hass-tabs-subpage";
import { showEnergyCustomiseDialog } from "./dialogs/show-dialog-energy-customise";

const INITIAL_CONFIG: EnergyPreferences = {
  energy_sources: [],
  device_consumption: [],
  device_consumption_water: [],
};

const TABS: PageNavigation[] = [
  {
    path: "/config/energy/electricity",
    translationKey: "ui.panel.config.energy.tabs.electricity",
    iconPath: mdiLightningBolt,
    iconColor: "#F1C447",
  },
  {
    path: "/config/energy/gas",
    translationKey: "ui.panel.config.energy.tabs.gas",
    iconPath: mdiFire,
    iconColor: "#F1C447",
  },
  {
    path: "/config/energy/water",
    translationKey: "ui.panel.config.energy.tabs.water",
    iconPath: mdiWater,
    iconColor: "#F1C447",
  },
];

// Editor pages are at <tab>/<kind>/<key>, with `new` as the key of a new item
const EDITOR_KINDS: Record<string, string[]> = {
  electricity: ["grid", "solar", "home", "battery", "device"],
  gas: ["gas"],
  water: ["water", "device"],
};

@customElement("ha-config-energy")
class HaConfigEnergy extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public narrow = false;

  @property({ attribute: "is-wide", type: Boolean }) public isWide = false;

  @property({ attribute: false }) public route!: Route;

  @state() private _info?: EnergyInfo;

  @state() private _preferences?: EnergyPreferences;

  @state() private _validationResult?: EnergyPreferencesValidation;

  @state() private _error?: string;

  @state() private _statsMetadata?: Record<string, StatisticsMetaData>;

  private get _currTab(): string {
    return this.route.path.split("/")[1] || "electricity";
  }

  protected willUpdate(changedProperties: PropertyValues<this>) {
    if (changedProperties.has("route")) {
      const [, tab, kind, ...key] = this.route.path.split("/");
      if (!tab || !TABS.some((t) => t.path.endsWith(`/${tab}`))) {
        navigate(`${this.route.prefix}/electricity`, { replace: true });
      } else if (
        kind &&
        (!key.join("/") || !EDITOR_KINDS[tab].includes(kind))
      ) {
        navigate(`${this.route.prefix}/${tab}`, { replace: true });
      }
    }
  }

  protected firstUpdated() {
    this._fetchConfig();
  }

  protected render(): TemplateResult | typeof nothing {
    if (!this._preferences && !this._error) {
      return html`<hass-loading-screen
        .hass=${this.hass}
        .narrow=${this.narrow}
      ></hass-loading-screen>`;
    }

    if (this._error) {
      return html`<hass-error-screen
        .hass=${this.hass}
        .narrow=${this.narrow}
        .error=${this._error}
      ></hass-error-screen>`;
    }

    const [, , kind, ...key] = this.route.path.split("/");
    if (kind) {
      // The page labels statistics with their metadata
      return this._statsMetadata
        ? this._renderEditorPage(kind, decodeURIComponent(key.join("/")))
        : html`<hass-loading-screen
            .hass=${this.hass}
            .narrow=${this.narrow}
          ></hass-loading-screen>`;
    }

    return html`
      <hass-tabs-subpage
        .hass=${this.hass}
        back-path="/config/lovelace/dashboards"
        .route=${this.route}
        .tabs=${TABS}
      >
        <div slot="toolbar-icon" class="toolbar-icons">
          <ha-icon-button
            .path=${mdiViewDashboardEdit}
            .label=${this.hass.localize(
              "ui.panel.config.energy.customise.toolbar_action"
            )}
            @click=${this._customise}
          ></ha-icon-button>
          <ha-icon-button
            .path=${mdiDownload}
            .label=${this.hass.localize(
              "ui.panel.config.devices.download_diagnostics"
            )}
            @click=${this._downloadDiagnostics}
          ></ha-icon-button>
        </div>
        <ha-alert>
          ${this.hass.localize("ui.panel.config.energy.new_device_info")}
        </ha-alert>
        <div class="content">${cache(this._renderTabContent())}</div>
      </hass-tabs-subpage>
    `;
  }

  private _renderTabContent(): TemplateResult | typeof nothing {
    const listPath = `${this.route.prefix}/${this._currTab}`;
    switch (this._currTab) {
      case "electricity":
        return html`
          <ha-energy-grid-settings
            .hass=${this.hass}
            .preferences=${this._preferences!}
            .listPath=${listPath}
            .statsMetadata=${this._statsMetadata}
            .validationResult=${this._validationResult}
            @value-changed=${this._prefsChanged}
          ></ha-energy-grid-settings>
          <ha-energy-solar-settings
            .hass=${this.hass}
            .preferences=${this._preferences!}
            .listPath=${listPath}
            .statsMetadata=${this._statsMetadata}
            .validationResult=${this._validationResult}
            .info=${this._info}
            @value-changed=${this._prefsChanged}
          ></ha-energy-solar-settings>
          <ha-energy-home-settings
            .hass=${this.hass}
            .preferences=${this._preferences!}
            .listPath=${listPath}
            .validationResult=${this._validationResult}
            @value-changed=${this._prefsChanged}
          ></ha-energy-home-settings>
          <ha-energy-battery-settings
            .hass=${this.hass}
            .preferences=${this._preferences!}
            .listPath=${listPath}
            .statsMetadata=${this._statsMetadata}
            .validationResult=${this._validationResult}
            @value-changed=${this._prefsChanged}
          ></ha-energy-battery-settings>
          <ha-energy-device-settings
            .hass=${this.hass}
            .preferences=${this._preferences!}
            .listPath=${listPath}
            .statsMetadata=${this._statsMetadata}
            .validationResult=${this._validationResult}
            @value-changed=${this._prefsChanged}
          ></ha-energy-device-settings>
        `;
      case "gas":
        return html`
          <ha-energy-gas-settings
            .hass=${this.hass}
            .preferences=${this._preferences!}
            .listPath=${listPath}
            .statsMetadata=${this._statsMetadata}
            .validationResult=${this._validationResult}
            @value-changed=${this._prefsChanged}
          ></ha-energy-gas-settings>
        `;
      case "water":
        return html`
          <ha-energy-water-settings
            .hass=${this.hass}
            .preferences=${this._preferences!}
            .listPath=${listPath}
            .statsMetadata=${this._statsMetadata}
            .validationResult=${this._validationResult}
            @value-changed=${this._prefsChanged}
          ></ha-energy-water-settings>
          <ha-energy-device-settings-water
            .hass=${this.hass}
            .preferences=${this._preferences!}
            .listPath=${listPath}
            .statsMetadata=${this._statsMetadata}
            .validationResult=${this._validationResult}
            @value-changed=${this._prefsChanged}
          ></ha-energy-device-settings-water>
        `;
      default:
        return nothing;
    }
  }

  private _renderEditorPage(kind: string, key: string) {
    const listPath = `${this.route.prefix}/${this._currTab}`;
    switch (`${this._currTab}/${kind}`) {
      case "electricity/grid":
        return html`<ha-energy-grid-settings
          class="editor-page"
          .hass=${this.hass}
          .narrow=${this.narrow}
          .preferences=${this._preferences!}
          .statsMetadata=${this._statsMetadata}
          .listPath=${listPath}
          .editKey=${key}
          @value-changed=${this._prefsChanged}
        ></ha-energy-grid-settings>`;
      case "electricity/solar":
        return html`<ha-energy-solar-settings
          class="editor-page"
          .hass=${this.hass}
          .narrow=${this.narrow}
          .preferences=${this._preferences!}
          .statsMetadata=${this._statsMetadata}
          .info=${this._info}
          .listPath=${listPath}
          .editKey=${key}
          @value-changed=${this._prefsChanged}
        ></ha-energy-solar-settings>`;
      case "electricity/home":
        return html`<ha-energy-home-settings
          class="editor-page"
          .hass=${this.hass}
          .narrow=${this.narrow}
          .preferences=${this._preferences!}
          .listPath=${listPath}
          .editKey=${key}
          @value-changed=${this._prefsChanged}
        ></ha-energy-home-settings>`;
      case "electricity/battery":
        return html`<ha-energy-battery-settings
          class="editor-page"
          .hass=${this.hass}
          .narrow=${this.narrow}
          .preferences=${this._preferences!}
          .statsMetadata=${this._statsMetadata}
          .listPath=${listPath}
          .editKey=${key}
          @value-changed=${this._prefsChanged}
        ></ha-energy-battery-settings>`;
      case "electricity/device":
        return html`<ha-energy-device-settings
          class="editor-page"
          .hass=${this.hass}
          .narrow=${this.narrow}
          .preferences=${this._preferences!}
          .statsMetadata=${this._statsMetadata}
          .listPath=${listPath}
          .editKey=${key}
          @value-changed=${this._prefsChanged}
        ></ha-energy-device-settings>`;
      case "gas/gas":
        return html`<ha-energy-gas-settings
          class="editor-page"
          .hass=${this.hass}
          .narrow=${this.narrow}
          .preferences=${this._preferences!}
          .statsMetadata=${this._statsMetadata}
          .listPath=${listPath}
          .editKey=${key}
          @value-changed=${this._prefsChanged}
        ></ha-energy-gas-settings>`;
      case "water/water":
        return html`<ha-energy-water-settings
          class="editor-page"
          .hass=${this.hass}
          .narrow=${this.narrow}
          .preferences=${this._preferences!}
          .statsMetadata=${this._statsMetadata}
          .listPath=${listPath}
          .editKey=${key}
          @value-changed=${this._prefsChanged}
        ></ha-energy-water-settings>`;
      case "water/device":
        return html`<ha-energy-device-settings-water
          class="editor-page"
          .hass=${this.hass}
          .narrow=${this.narrow}
          .preferences=${this._preferences!}
          .statsMetadata=${this._statsMetadata}
          .listPath=${listPath}
          .editKey=${key}
          @value-changed=${this._prefsChanged}
        ></ha-energy-device-settings-water>`;
      default:
        return nothing;
    }
  }

  private async _fetchConfig() {
    this._error = undefined;

    const validationPromise = getEnergyPreferenceValidation(this.hass);
    const energyInfoPromise = await getEnergyInfo(this.hass.callWS);
    try {
      this._preferences = await getEnergyPreferences(this.hass.callWS);
    } catch (err: any) {
      if (err.code === "not_found") {
        this._preferences = INITIAL_CONFIG;
      } else {
        this._error = err.message;
      }
    }
    try {
      this._validationResult = await validationPromise;
    } catch (err: any) {
      this._error = err.message;
    }
    this._info = await energyInfoPromise;
    await this._fetchMetaData();
  }

  private async _prefsChanged(ev: CustomEvent) {
    this._preferences = ev.detail.value;
    this._validationResult = undefined;
    try {
      this._validationResult = await getEnergyPreferenceValidation(this.hass);
    } catch (err: any) {
      this._error = err.message;
    }
    this._info = await getEnergyInfo(this.hass.callWS);
    await this._fetchMetaData();
  }

  private async _fetchMetaData() {
    if (!this._preferences || !this._info) {
      return;
    }
    const statIDs = getReferencedStatisticIds(this._preferences, this._info);
    const statsMetadataArray = await getStatisticMetadata(
      this.hass.callWS,
      statIDs
    );
    const statsMetadata: Record<string, StatisticsMetaData> = {};
    statsMetadataArray.forEach((x) => {
      statsMetadata[x.statistic_id] = x;
    });
    this._statsMetadata = statsMetadata;
  }

  private _customise() {
    if (!this._preferences) {
      return;
    }
    showEnergyCustomiseDialog(this, {
      preferences: this._preferences,
      saveCallback: () => {
        showToast(this, {
          message: this.hass.localize("ui.panel.config.energy.customise.saved"),
        });
      },
    });
  }

  private async _downloadDiagnostics() {
    const data = {
      version: this.hass.config.version,
      info: this._info,
      preferences: this._preferences,
      metadata: this._statsMetadata,
      entities: Object.fromEntries(
        Object.keys(this._statsMetadata || {}).map((key) => [
          key,
          this.hass.entities[key],
        ])
      ),
      states: Object.fromEntries(
        Object.keys(this._statsMetadata || {}).map((key) => [
          key,
          this.hass.states[key],
        ])
      ),
      issues: this._validationResult,
    };
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    fileDownload(url, "energy_diagnostics.json");
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        .toolbar-icons {
          display: flex;
          align-items: center;
        }
        .content {
          padding: 0 var(--ha-space-5);
          max-width: 1040px;
          margin: 0 auto;
        }

        ha-alert {
          display: block;
          margin: 12px auto;
          max-width: 600px;
        }

        ha-energy-grid-settings,
        ha-energy-solar-settings,
        ha-energy-home-settings,
        ha-energy-battery-settings,
        ha-energy-gas-settings,
        ha-energy-water-settings,
        ha-energy-device-settings,
        ha-energy-device-settings-water {
          display: block;
          max-width: 600px;
          margin: 0 auto 12px;
        }

        .editor-page {
          height: 100%;
          max-width: none;
          margin: 0;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-config-energy": HaConfigEnergy;
  }
}
