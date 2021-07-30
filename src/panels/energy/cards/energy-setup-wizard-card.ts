import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../common/dom/fire_event";
import { EnergyPreferences, saveEnergyPreferences } from "../../../data/energy";
import { LovelaceCardConfig } from "../../../data/lovelace";
import { HomeAssistant } from "../../../types";
import { LovelaceCard, Lovelace } from "../../lovelace/types";
import "@material/mwc-button/mwc-button";
import "../../config/energy/components/ha-energy-grid-settings";
import "../../config/energy/components/ha-energy-solar-settings";
import "../../config/energy/components/ha-energy-device-settings";
import { haStyle } from "../../../resources/styles";
import { showAlertDialog } from "../../../dialogs/generic/show-dialog-box";

@customElement("energy-setup-wizard-card")
export class EnergySetupWizard extends LitElement implements LovelaceCard {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public lovelace?: Lovelace;

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
  }

  protected render(): TemplateResult {
    return html`
      <p>Step ${this._step + 1} of 3</p>
      ${this._step === 0
        ? html` <ha-energy-grid-settings
            .hass=${this.hass}
            .preferences=${this._preferences}
            @value-changed=${this._prefsChanged}
          ></ha-energy-grid-settings>`
        : this._step === 1
        ? html` <ha-energy-solar-settings
            .hass=${this.hass}
            .preferences=${this._preferences}
            @value-changed=${this._prefsChanged}
          ></ha-energy-solar-settings>`
        : html` <ha-energy-device-settings
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
        ${this._step < 2
          ? html`<mwc-button unelevated @click=${this._next}
              >${this.hass.localize("ui.panel.energy.setup.next")}</mwc-button
            >`
          : html`<mwc-button unelevated @click=${this._setupDone}>
              ${this.hass.localize("ui.panel.energy.setup.done")}
            </mwc-button>`}
      </div>
    `;
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
    if (this._step === 2) {
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
    } catch (err) {
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
