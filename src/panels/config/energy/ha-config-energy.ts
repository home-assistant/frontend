import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";

import "../../../components/ha-svg-icon";
import { EnergyPreferences, getEnergyPreferences } from "../../../data/energy";

import "../../../layouts/hass-loading-screen";
import "../../../layouts/hass-tabs-subpage";
import { haStyle } from "../../../resources/styles";
import type { HomeAssistant, Route } from "../../../types";
import { configSections } from "../ha-panel-config";
import "./components/ha-energy-grid-settings";
import "./components/ha-energy-solar-settings";
import "./components/ha-energy-device-settings";

const INITIAL_CONFIG = {
  currency: "€",
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

  @state() private _preferences?: EnergyPreferences;

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
        back-path="/config"
        .route=${this.route}
        .tabs=${configSections.experiences}
      >
        <div class="container">
          <ha-energy-grid-settings
            .hass=${this.hass}
            .preferences=${this._preferences}
            @value-changed=${this._prefsChanged}
          ></ha-energy-grid-settings>
          <ha-energy-solar-settings
            .hass=${this.hass}
            .preferences=${this._preferences}
            @value-changed=${this._prefsChanged}
          ></ha-energy-solar-settings>
          <ha-energy-device-settings
            .hass=${this.hass}
            .preferences=${this._preferences}
            @value-changed=${this._prefsChanged}
          ></ha-energy-device-settings>
        </div>
      </hass-tabs-subpage>
    `;
  }

  private async _fetchConfig() {
    try {
      this._preferences = await getEnergyPreferences(this.hass);
    } catch (e) {
      if (e.code === "not_found") {
        this._preferences = INITIAL_CONFIG;
      } else {
        this._error = e.message;
      }
    }
  }

  private _prefsChanged(ev: CustomEvent) {
    this._preferences = ev.detail.value;
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        .container {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
          grid-gap: 8px 8px;
          padding: 8px;
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
