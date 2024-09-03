import "@material/mwc-button/mwc-button";
import { mdiPlus } from "@mdi/js";
import { CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-card";
import "../../../../components/ha-icon-button";
import {
  EnergyPreferences,
  saveEnergyPreferences,
  GenericSourceTypeEnergyPreference,
} from "../../../../data/energy";

import { haStyle } from "../../../../resources/styles";
import { HomeAssistant } from "../../../../types";
import { showEnergySettingsGenericDialog } from "../dialogs/show-dialogs-energy";
import "./ha-energy-validation-result";
import { energyCardStyles } from "./styles";

@customElement("ha-energy-new-generic-settings")
export class EnergyNewGenericSettings extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false })
  public preferences!: EnergyPreferences;

  protected render(): TemplateResult {
    return html`
      <ha-card outlined>
        <h1 class="card-header">
          ${this.hass.localize("ui.panel.config.energy.generic.new_title")}
        </h1>
        <div class="card-content">
          <div class="row border-bottom">
            <ha-svg-icon .path=${mdiPlus}></ha-svg-icon>
            <mwc-button @click=${this._addType}
              >${this.hass.localize(
                "ui.panel.config.energy.generic.new_type_button"
              )}</mwc-button
            >
          </div>
        </div>
      </ha-card>
    `;
  }

  private _addType() {
    showEnergySettingsGenericDialog(this, {
      generic_sources: [] as GenericSourceTypeEnergyPreference[],
      saveCallback: async (source) => {
        delete source.unit_of_measurement;
        await this._savePreferences({
          ...this.preferences,
          energy_sources: this.preferences.energy_sources.concat(source),
        });
      },
    });
  }

  private async _savePreferences(preferences: EnergyPreferences) {
    const result = await saveEnergyPreferences(this.hass, preferences);
    fireEvent(this, "value-changed", { value: result });
  }

  static get styles(): CSSResultGroup {
    return [haStyle, energyCardStyles];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-energy-new-generic-settings": EnergyNewGenericSettings;
  }
}
