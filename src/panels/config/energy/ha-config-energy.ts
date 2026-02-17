import "../../../layouts/hass-error-screen";
import { mdiDownload } from "@mdi/js";
import type { CSSResultGroup, TemplateResult } from "lit";
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
import "./components/ha-energy-battery-settings";
import "./components/ha-energy-gas-settings";
import "./components/ha-energy-water-settings";
import { fileDownload } from "../../../util/file_download";
import { configSections } from "../ha-panel-config";

const INITIAL_CONFIG: EnergyPreferences = {
  energy_sources: [],
  device_consumption: [],
  device_consumption_water: [],
};

const TABS = ["electricity", "gas", "water"];

@customElement("ha-config-energy")
class HaConfigEnergy extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public narrow = false;

  @property({ attribute: "is-wide", type: Boolean }) public isWide = false;

  @property({ attribute: false }) public showAdvanced = false;

  @property({ attribute: false }) public route!: Route;

  @state() private _searchParms = new URLSearchParams(window.location.search);

  @state() private _info?: EnergyInfo;

  @state() private _preferences?: EnergyPreferences;

  @state() private _validationResult?: EnergyPreferencesValidation;

  @state() private _error?: string;

  @state() private _statsMetadata?: Record<string, StatisticsMetaData>;

  private get _currTab(): string {
    return this.route.path.substring(1) || "electricity";
  }

  protected firstUpdated() {
    const tab = this.route.path.substring(1);
    if (!tab || !TABS.includes(tab)) {
      navigate(`${this.route.prefix}/electricity`, { replace: true });
    }
    this._fetchConfig();
  }

  protected render(): TemplateResult {
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

    return html`
      <hass-tabs-subpage
        .hass=${this.hass}
        .narrow=${this.narrow}
        .backPath=${this._searchParms.has("historyBack")
          ? undefined
          : "/config/lovelace/dashboards"}
        .route=${this.route}
        .tabs=${configSections.energy}
      >
        <ha-icon-button
          slot="toolbar-icon"
          .path=${mdiDownload}
          .label=${this.hass.localize(
            "ui.panel.config.devices.download_diagnostics"
          )}
          @click=${this._downloadDiagnostics}
        ></ha-icon-button>
        <ha-alert>
          ${this.hass.localize("ui.panel.config.energy.new_device_info")}
        </ha-alert>
        <div class="content">${cache(this._renderTabContent())}</div>
      </hass-tabs-subpage>
    `;
  }

  private _renderTabContent(): TemplateResult | typeof nothing {
    switch (this._currTab) {
      case "electricity":
        return html`
          <ha-energy-grid-settings
            .hass=${this.hass}
            .preferences=${this._preferences!}
            .statsMetadata=${this._statsMetadata}
            .validationResult=${this._validationResult}
            @value-changed=${this._prefsChanged}
          ></ha-energy-grid-settings>
          <ha-energy-solar-settings
            .hass=${this.hass}
            .preferences=${this._preferences!}
            .statsMetadata=${this._statsMetadata}
            .validationResult=${this._validationResult}
            .info=${this._info}
            @value-changed=${this._prefsChanged}
          ></ha-energy-solar-settings>
          <ha-energy-battery-settings
            .hass=${this.hass}
            .preferences=${this._preferences!}
            .statsMetadata=${this._statsMetadata}
            .validationResult=${this._validationResult}
            @value-changed=${this._prefsChanged}
          ></ha-energy-battery-settings>
          <ha-energy-device-settings
            .hass=${this.hass}
            .preferences=${this._preferences!}
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
            .statsMetadata=${this._statsMetadata}
            .validationResult=${this._validationResult}
            @value-changed=${this._prefsChanged}
          ></ha-energy-water-settings>
          <ha-energy-device-settings-water
            .hass=${this.hass}
            .preferences=${this._preferences!}
            .statsMetadata=${this._statsMetadata}
            .validationResult=${this._validationResult}
            @value-changed=${this._prefsChanged}
          ></ha-energy-device-settings-water>
        `;
      default:
        return nothing;
    }
  }

  private async _fetchConfig() {
    this._error = undefined;

    const validationPromise = getEnergyPreferenceValidation(this.hass);
    const energyInfoPromise = await getEnergyInfo(this.hass);
    try {
      this._preferences = await getEnergyPreferences(this.hass);
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
    this._info = await getEnergyInfo(this.hass);
    await this._fetchMetaData();
  }

  private async _fetchMetaData() {
    if (!this._preferences || !this._info) {
      return;
    }
    const statIDs = getReferencedStatisticIds(this._preferences, this._info);
    const statsMetadataArray = await getStatisticMetadata(this.hass, statIDs);
    const statsMetadata: Record<string, StatisticsMetaData> = {};
    statsMetadataArray.forEach((x) => {
      statsMetadata[x.statistic_id] = x;
    });
    this._statsMetadata = statsMetadata;
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
        ha-energy-battery-settings,
        ha-energy-gas-settings,
        ha-energy-water-settings,
        ha-energy-device-settings,
        ha-energy-device-settings-water {
          display: block;
          max-width: 600px;
          margin: 0 auto 12px;
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
