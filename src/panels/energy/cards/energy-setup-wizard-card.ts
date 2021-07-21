import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../common/dom/fire_event";
import { EnergyPreferences } from "../../../data/energy";
import { LovelaceCardConfig } from "../../../data/lovelace";
import { HomeAssistant } from "../../../types";
import { LovelaceCard, Lovelace } from "../../lovelace/types";
import "@material/mwc-button/mwc-button";
import "../../config/energy/components/ha-energy-grid-settings";
import "../../config/energy/components/ha-energy-solar-settings";
import "../../config/energy/components/ha-energy-device-settings";

@customElement("energy-setup-wizard-card")
export class EnergySetupWizard extends LitElement implements LovelaceCard {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public lovelace?: Lovelace;

  @state() private _step = 0;

  private _preferences: EnergyPreferences = {
    currency: "€",
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

  protected render(): TemplateResult {
    return html`
      <h1>Welcome to your energy dashboard!</h1>
      <p>
        Here we need some flashy text to tell people about the amazing things
        this dashboard will do for them and what insight it will give!
      </p>
      <p>Plus maybe some cool graphics so it doesn't look so boring...</p>
      <h2>${this.hass.localize("ui.panel.energy.setup.header")}</h2>

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
      ${this._step > 0
        ? html`<mwc-button @click=${this._back}
            >${this.hass.localize("ui.panel.energy.setup.back")}</mwc-button
          >`
        : ""}
      ${this._step < 2
        ? html`<mwc-button outlined @click=${this._next}
            >${this.hass.localize("ui.panel.energy.setup.next")}</mwc-button
          >`
        : html`<mwc-button raised @click=${this._setupDone}>
            ${this.hass.localize("ui.panel.energy.setup.done")}
          </mwc-button>`}
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

  private _setupDone() {
    fireEvent(this, "reload-energy-panel");
  }

  static get styles(): CSSResultGroup {
    return [
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
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "energy-setup-wizard-card": EnergySetupWizard;
  }
}
