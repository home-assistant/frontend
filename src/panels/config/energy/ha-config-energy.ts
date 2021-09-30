import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import "../../../components/ha-svg-icon";
import {
  EnergyPreferencesValidation,
  getEnergyPreferenceValidation,
  EnergyInfo,
  EnergyPreferences,
  getEnergyInfo,
  getEnergyPreferences,
} from "../../../data/energy";
import "../../../layouts/hass-loading-screen";
import "../../../layouts/hass-tabs-subpage";
import { haStyle } from "../../../resources/styles";
import type { HomeAssistant, Route } from "../../../types";
import "../../../components/ha-alert";
import { configSections } from "../ha-panel-config";
import "./components/ha-energy-device-settings";
import "./components/ha-energy-grid-settings";
import "./components/ha-energy-solar-settings";
import "./components/ha-energy-battery-settings";
import "./components/ha-energy-gas-settings";

const INITIAL_CONFIG: EnergyPreferences = {
  energy_sources: [],
  device_consumption: [],
};

@customElement("ha-config-energy")
class HaConfigEnergy extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public narrow!: boolean;

  @property({ type: Boolean }) public isWide!: boolean;

  @property({ type: Boolean }) public showAdvanced!: boolean;

  @property({ attribute: false }) public route!: Route;

  @state() private _searchParms = new URLSearchParams(window.location.search);

  @state() private _info?: EnergyInfo;

  @state() private _preferences?: EnergyPreferences;

  @state() private _validationResult?: EnergyPreferencesValidation;

  @state() private _error?: string;

  protected firstUpdated() {
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
          : "/config"}
        .route=${this.route}
        .tabs=${configSections.experiences}
      >
        <ha-alert>
          After setting up a new device, it can take up to 2 hours for new data
          to arrive in your energy dashboard.
        </ha-alert>
        <div class="container">
          <ha-energy-grid-settings
            .hass=${this.hass}
            .preferences=${this._preferences!}
            .validationResult=${this._validationResult!}
            @value-changed=${this._prefsChanged}
          ></ha-energy-grid-settings>
          <ha-energy-solar-settings
            .hass=${this.hass}
            .preferences=${this._preferences!}
            .validationResult=${this._validationResult!}
            .info=${this._info}
            @value-changed=${this._prefsChanged}
          ></ha-energy-solar-settings>
          <ha-energy-battery-settings
            .hass=${this.hass}
            .preferences=${this._preferences!}
            .validationResult=${this._validationResult!}
            @value-changed=${this._prefsChanged}
          ></ha-energy-battery-settings>
          <ha-energy-gas-settings
            .hass=${this.hass}
            .preferences=${this._preferences!}
            .validationResult=${this._validationResult!}
            @value-changed=${this._prefsChanged}
          ></ha-energy-gas-settings>
          <ha-energy-device-settings
            .hass=${this.hass}
            .preferences=${this._preferences!}
            .validationResult=${this._validationResult!}
            @value-changed=${this._prefsChanged}
          ></ha-energy-device-settings>
        </div>
      </hass-tabs-subpage>
    `;
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
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        ha-alert {
          display: block;
          margin: 8px;
        }
        .container {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
          grid-gap: 8px 8px;
          margin: 8px;
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
