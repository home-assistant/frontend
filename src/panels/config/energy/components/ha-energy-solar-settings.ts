import "@material/mwc-button/mwc-button";
import { mdiDelete, mdiPencil, mdiSolarPower } from "@mdi/js";
import { CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../../../../common/dom/fire_event";
import { computeStateName } from "../../../../common/entity/compute_state_name";
import "../../../../components/entity/ha-statistic-picker";
import "../../../../components/ha-card";
import "../../../../components/ha-settings-row";
import {
  EnergyPreferences,
  energySourcesByType,
  saveEnergyPreferences,
  SolarSourceTypeEnergyPreference,
} from "../../../../data/energy";
import {
  showConfirmationDialog,
  showAlertDialog,
} from "../../../../dialogs/generic/show-dialog-box";
import { haStyle } from "../../../../resources/styles";
import { HomeAssistant } from "../../../../types";
import { documentationUrl } from "../../../../util/documentation-url";
import { showEnergySettingsSolarDialog } from "../dialogs/show-dialogs-energy";
import { energyCardStyles } from "./styles";

@customElement("ha-energy-solar-settings")
export class EnergySolarSettings extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false })
  public preferences!: EnergyPreferences;

  protected render(): TemplateResult {
    const types = energySourcesByType(this.preferences);

    const solarSources = types.solar || [];

    return html`
      <ha-card>
        <h1 class="card-header">
          <ha-svg-icon .path=${mdiSolarPower}></ha-svg-icon>
          ${this.hass.localize("ui.panel.config.energy.solar.title")}
        </h1>

        <div class="card-content">
          <p>
            ${this.hass.localize("ui.panel.config.energy.solar.sub")}
            <a
              target="_blank"
              rel="noopener noreferrer"
              href="${documentationUrl(
                this.hass,
                "/docs/energy/solar-panels/"
              )}"
              >${this.hass.localize(
                "ui.panel.config.energy.solar.learn_more"
              )}</a
            >
          </p>
          <h3>Solar production</h3>
          ${solarSources.map((source) => {
            const entityState = this.hass.states[source.stat_energy_from];
            return html`
              <div class="row" .source=${source}>
                ${entityState?.attributes.icon
                  ? html`<ha-icon
                      .icon=${entityState.attributes.icon}
                    ></ha-icon>`
                  : html`<ha-svg-icon .path=${mdiSolarPower}></ha-svg-icon>`}
                <span class="content"
                  >${entityState
                    ? computeStateName(entityState)
                    : source.stat_energy_from}</span
                >
                <mwc-icon-button @click=${this._editSource}>
                  <ha-svg-icon .path=${mdiPencil}></ha-svg-icon>
                </mwc-icon-button>
                <mwc-icon-button @click=${this._deleteSource}>
                  <ha-svg-icon .path=${mdiDelete}></ha-svg-icon>
                </mwc-icon-button>
              </div>
            `;
          })}
          <div class="row border-bottom">
            <ha-svg-icon .path=${mdiSolarPower}></ha-svg-icon>
            <mwc-button @click=${this._addSource}
              >Add solar production</mwc-button
            >
          </div>
        </div>
      </ha-card>
    `;
  }

  private _addSource() {
    showEnergySettingsSolarDialog(this, {
      saveCallback: async (source) => {
        await this._savePreferences({
          ...this.preferences,
          energy_sources: this.preferences.energy_sources.concat(source),
        });
      },
    });
  }

  private _editSource(ev) {
    const origSource: SolarSourceTypeEnergyPreference =
      ev.currentTarget.closest(".row").source;
    showEnergySettingsSolarDialog(this, {
      source: { ...origSource },
      saveCallback: async (newSource) => {
        await this._savePreferences({
          ...this.preferences,
          energy_sources: this.preferences.energy_sources.map((src) =>
            src === origSource ? newSource : src
          ),
        });
      },
    });
  }

  private async _deleteSource(ev) {
    const sourceToDelete: SolarSourceTypeEnergyPreference =
      ev.currentTarget.closest(".row").source;

    if (
      !(await showConfirmationDialog(this, {
        title: "Are you sure you wan't to delete this source?",
      }))
    ) {
      return;
    }

    try {
      await this._savePreferences({
        ...this.preferences,
        energy_sources: this.preferences.energy_sources.filter(
          (source) => source !== sourceToDelete
        ),
      });
    } catch (err) {
      showAlertDialog(this, { title: `Failed to save config: ${err.message}` });
    }
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
    "ha-energy-solar-settings": EnergySolarSettings;
  }
}
