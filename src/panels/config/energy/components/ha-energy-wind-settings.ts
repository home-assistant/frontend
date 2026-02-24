import { mdiDelete, mdiPencil, mdiPlus, mdiWindPower } from "@mdi/js";
import type { CSSResultGroup, TemplateResult } from "lit";
import { html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-card";
import "../../../../components/ha-button";
import "../../../../components/ha-icon-button";
import type {
  EnergyInfo,
  EnergyPreferences,
  EnergyPreferencesValidation,
  EnergyValidationIssue,
  WindSourceTypeEnergyPreference,
} from "../../../../data/energy";
import { saveEnergyPreferences } from "../../../../data/energy";
import type { StatisticsMetaData } from "../../../../data/recorder";
import { getStatisticLabel } from "../../../../data/recorder";
import {
  showConfirmationDialog,
  showAlertDialog,
} from "../../../../dialogs/generic/show-dialog-box";
import { haStyle } from "../../../../resources/styles";
import type { HomeAssistant } from "../../../../types";
import { documentationUrl } from "../../../../util/documentation-url";
import { showEnergySettingsWindDialog } from "../dialogs/show-dialogs-energy";
import "./ha-energy-validation-result";
import { energyCardStyles } from "./styles";

@customElement("ha-energy-wind-settings")
export class EnergyWindSettings extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false })
  public preferences!: EnergyPreferences;

  @property({ attribute: false })
  public statsMetadata?: Record<string, StatisticsMetaData>;

  @property({ attribute: false })
  public validationResult?: EnergyPreferencesValidation;

  @property({ attribute: false })
  public info?: EnergyInfo;

  protected render(): TemplateResult {
    const windSources: WindSourceTypeEnergyPreference[] = [];
    const windValidation: EnergyValidationIssue[][] = [];

    this.preferences.energy_sources.forEach((source, idx) => {
      if (source.type !== "wind") {
        return;
      }
      windSources.push(source);

      if (this.validationResult) {
        windValidation.push(this.validationResult.energy_sources[idx]);
      }
    });

    return html`
      <ha-card>
        <h1 class="card-header">
          <ha-svg-icon .path=${mdiWindPower}></ha-svg-icon>
          ${this.hass.localize("ui.panel.config.energy.wind.title")}
        </h1>

        <div class="card-content">
          <p>
            ${this.hass.localize("ui.panel.config.energy.wind.sub")}
            <a
              target="_blank"
              rel="noopener noreferrer"
              href=${documentationUrl(this.hass, "/docs/energy/wind-turbines/")}
              >${this.hass.localize(
                "ui.panel.config.energy.wind.learn_more"
              )}</a
            >
          </p>
          ${windValidation.map(
            (result) => html`
              <ha-energy-validation-result
                .hass=${this.hass}
                .issues=${result}
              ></ha-energy-validation-result>
            `
          )}
          ${windSources.length > 0
            ? html`
                <div class="items-container">
                  ${windSources.map((source) => {
                    const entityState =
                      this.hass.states[source.stat_energy_from];
                    return html`
                      <div class="row" .source=${source}>
                        ${entityState?.attributes.icon
                          ? html`<ha-icon
                              .icon=${entityState.attributes.icon}
                            ></ha-icon>`
                          : html`<ha-svg-icon
                              .path=${mdiWindPower}
                            ></ha-svg-icon>`}
                        <span class="content"
                          >${getStatisticLabel(
                            this.hass,
                            source.stat_energy_from,
                            this.statsMetadata?.[source.stat_energy_from]
                          )}</span
                        >
                        ${this.info
                          ? html`
                              <ha-icon-button
                                .label=${this.hass.localize(
                                  "ui.panel.config.energy.wind.edit_wind_production"
                                )}
                                @click=${this._editSource}
                                .path=${mdiPencil}
                              ></ha-icon-button>
                            `
                          : ""}
                        <ha-icon-button
                          .label=${this.hass.localize(
                            "ui.panel.config.energy.wind.delete_wind_production"
                          )}
                          @click=${this._deleteSource}
                          .path=${mdiDelete}
                        ></ha-icon-button>
                      </div>
                    `;
                  })}
                </div>
              `
            : ""}
          ${this.info
            ? html`
                <div class="row">
                  <ha-button
                    @click=${this._addSource}
                    appearance="filled"
                    size="small"
                  >
                    <ha-svg-icon slot="start" .path=${mdiPlus}></ha-svg-icon>
                    ${this.hass.localize(
                      "ui.panel.config.energy.wind.add_wind_production"
                    )}
                  </ha-button>
                </div>
              `
            : ""}
        </div>
      </ha-card>
    `;
  }

  private _addSource() {
    showEnergySettingsWindDialog(this, {
      info: this.info!,
      wind_sources: this.preferences.energy_sources.filter(
        (src) => src.type === "wind"
      ) as WindSourceTypeEnergyPreference[],
      saveCallback: async (source) => {
        await this._savePreferences({
          ...this.preferences,
          energy_sources: this.preferences.energy_sources.concat(source),
        });
      },
    });
  }

  private _editSource(ev) {
    const origSource: WindSourceTypeEnergyPreference =
      ev.currentTarget.closest(".row").source;
    showEnergySettingsWindDialog(this, {
      info: this.info!,
      source: { ...origSource },
      wind_sources: this.preferences.energy_sources.filter(
        (src) => src.type === "wind"
      ) as WindSourceTypeEnergyPreference[],
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
    const sourceToDelete: WindSourceTypeEnergyPreference =
      ev.currentTarget.closest(".row").source;

    if (
      !(await showConfirmationDialog(this, {
        title: this.hass.localize("ui.panel.config.energy.delete_source"),
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
    } catch (err: any) {
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
    "ha-energy-wind-settings": EnergyWindSettings;
  }
}
