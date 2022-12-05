import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../common/dom/fire_event";
import {
  EnergyInfo,
  EnergyPreferences,
  getEnergyInfo,
  saveEnergyPreferences,
} from "../../../data/energy";
import { LovelaceCardConfig } from "../../../data/lovelace";
import { HomeAssistant } from "../../../types";
import { LovelaceCard, Lovelace } from "../../lovelace/types";
import "@material/mwc-button/mwc-button";
import "../../config/energy/components/ha-energy-grid-settings";
import "../../config/energy/components/ha-energy-solar-settings";
import "../../config/energy/components/ha-energy-battery-settings";
import "../../config/energy/components/ha-energy-gas-settings";
import "../../config/energy/components/ha-energy-water-settings";
import "../../config/energy/components/ha-energy-device-settings";
import { haStyle } from "../../../resources/styles";
import { showAlertDialog } from "../../../dialogs/generic/show-dialog-box";

@customElement("energy-setup-wizard-card")
export class EnergySetupWizard extends LitElement implements LovelaceCard {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public lovelace?: Lovelace;

  @state() private _info?: EnergyInfo;

  @state() private _step = 0;

  @state() private _preferences: EnergyPreferences = {
    energy_sources: [],
    device_consumption: [],
  };

  public getCardSize() {
    return 10;
  }

  public setConfig(config: LovelaceCardConfig) {
    if (config.preferences) {
      this._preferences = config.preferences;
    }
  }

  protected firstUpdated() {
    this.hass.loadFragmentTranslation("config");
    this._fetchconfig();
  }

  protected render(): TemplateResult {
    return html`
      <p>
        ${this.hass.localize("ui.panel.energy.setup.step", {
          step: this._step + 1,
          steps: 6,
        })}
      </p>
      ${this._step === 0
        ? html`<ha-energy-grid-settings
            .hass=${this.hass}
            .preferences=${this._preferences}
            @value-changed=${this._prefsChanged}
          ></ha-energy-grid-settings>`
        : this._step === 1
        ? html`<ha-energy-solar-settings
            .hass=${this.hass}
            .preferences=${this._preferences}
            .info=${this._info}
            @value-changed=${this._prefsChanged}
          ></ha-energy-solar-settings>`
        : this._step === 2
        ? html`<ha-energy-battery-settings
            .hass=${this.hass}
            .preferences=${this._preferences}
            @value-changed=${this._prefsChanged}
          ></ha-energy-battery-settings>`
        : this._step === 3
        ? html`<ha-energy-gas-settings
            .hass=${this.hass}
            .preferences=${this._preferences}
            @value-changed=${this._prefsChanged}
          ></ha-energy-gas-settings>`
        : this._step === 4
        ? html`<ha-energy-water-settings
            .hass=${this.hass}
            .preferences=${this._preferences}
            @value-changed=${this._prefsChanged}
          ></ha-energy-water-settings>`
        : html`<ha-energy-device-settings
            .hass=${this.hass}
            .preferences=${this._preferences}
            @value-changed=${this._prefsChanged}
          ></ha-energy-device-settings>`}
      <div class="buttons">
        ${this._step > 0
          ? html`<mwc-button outlined @click=${this._back}
              >${this.hass.localize("ui.panel.energy.setup.back")}</mwc-button
            >`
          : html`<div></div>`}
        ${this._step < 4
          ? html`<mwc-button unelevated @click=${this._next}
              >${this.hass.localize("ui.panel.energy.setup.next")}</mwc-button
            >`
          : html`<mwc-button unelevated @click=${this._setupDone}>
              ${this.hass.localize("ui.panel.energy.setup.done")}
            </mwc-button>`}
      </div>
    `;
  }

  private async _fetchconfig() {
    this._info = await getEnergyInfo(this.hass);
  }

  private _prefsChanged(ev: CustomEvent) {
    this._preferences = ev.detail.value;
  }

  private _back() {
    if (this._step === 0) {
      return;
    }
    this._step--;
  }

  private _next() {
    if (this._step === 5) {
      return;
    }
    this._step++;
  }

  private async _setupDone() {
    if (!this._preferences) {
      return;
    }
    try {
      this._preferences = await saveEnergyPreferences(
        this.hass,
        this._preferences
      );
    } catch (err: any) {
      showAlertDialog(this, { title: `Failed to save config: ${err.message}` });
    }
    fireEvent(this, "reload-energy-panel");
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        :host {
          display: block;
          padding: 16px;
          max-width: 700px;
          margin: 0 auto;
        }
        mwc-button {
          margin-top: 8px;
        }
        .buttons {
          display: flex;
          justify-content: space-between;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "energy-setup-wizard-card": EnergySetupWizard;
  }
}
