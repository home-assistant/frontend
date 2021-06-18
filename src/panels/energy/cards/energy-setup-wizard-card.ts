import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../../../common/dom/fire_event";
import { EnergyPreferences } from "../../../data/energy";
import { LovelaceCardConfig } from "../../../data/lovelace";
import { HomeAssistant } from "../../../types";
import { LovelaceCard, Lovelace } from "../../lovelace/types";
import "../ha-energy-settings";
import type { EnergySettings } from "../ha-energy-settings";

@customElement("energy-setup-wizard-card")
export class EnergySetupWizard extends LitElement implements LovelaceCard {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public lovelace?: Lovelace;

  private _prefs: Partial<EnergyPreferences> = {};

  public getCardSize() {
    return 10;
  }

  public setConfig(config: LovelaceCardConfig) {
    if (config.preferences) {
      this._prefs = config.preferences;
    }
  }

  protected render(): TemplateResult {
    return html`
      <h2>${this.hass.localize("ui.panel.energy.setup.header")}</h2>
      <ha-energy-settings
        .hass=${this.hass}
        .preferences=${this._prefs}
        @value-changed=${this._prefsChanged}
      ></ha-energy-settings>
      <mwc-button @click=${this._savePrefs}
        >${this.hass.localize("ui.common.save")}</mwc-button
      >
    `;
  }

  private _prefsChanged(ev: CustomEvent) {
    this._prefs = ev.detail.value;
  }

  private async _savePrefs() {
    try {
      await (this.shadowRoot!.querySelector(
        "ha-energy-settings"
      ) as EnergySettings).savePreferences();
      fireEvent(this, "reload-energy-panel");
    } catch (e) {
      // don't close
    }
  }

  static get styles(): CSSResultGroup {
    return [
      css`
        :host {
          display: block;
          padding: 16px;
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
