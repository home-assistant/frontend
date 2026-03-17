import { mdiDelete, mdiPencil, mdiPlus, mdiSolarPower } from "@mdi/js";
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
  SolarSourceTypeEnergyPreference,
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
import { showEnergySettingsSolarDialog } from "../dialogs/show-dialogs-energy";
import "./ha-energy-validation-result";
import { energyCardStyles } from "./styles";

@customElement("ha-energy-solar-settings")
export class EnergySolarSettings extends LitElement {
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
    const solarSources: SolarSourceTypeEnergyPreference[] = [];
    const solarValidation: EnergyValidationIssue[][] = [];

    this.preferences.energy_sources.forEach((source, idx) => {
      if (source.type !== "solar") {
        return;
      }
      solarSources.push(source);

      if (this.validationResult) {
        solarValidation.push(this.validationResult.energy_sources[idx]);
      }
    });

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
              href=${documentationUrl(this.hass, "/docs/energy/solar-panels/")}
              >${this.hass.localize(
                "ui.panel.config.energy.solar.learn_more"
              )}</a
            >
          </p>
          ${solarValidation.map(
            (result) => html`
              <ha-energy-validation-result
                .hass=${this.hass}
                .issues=${result}
              ></ha-energy-validation-result>
            `
          )}
          ${solarSources.length > 0
            ? html`
                <div class="items-container">
                  ${solarSources.map((source) => {
                    const entityState =
                      this.hass.states[source.stat_energy_from];
                    return html`
                      <div class="row" .source=${source}>
                        ${entityState?.attributes.icon
                          ? html`<ha-icon
                              .icon=${entityState.attributes.icon}
                            ></ha-icon>`
                          : html`<ha-svg-icon
                              .path=${mdiSolarPower}
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
                                  "ui.panel.config.energy.solar.edit_solar_production"
                                )}
                                @click=${this._editSource}
                                .path=${mdiPencil}
                              ></ha-icon-button>
                            `
                          : ""}
                        <ha-icon-button
                          .label=${this.hass.localize(
                            "ui.panel.config.energy.solar.remove_solar_production"
                          )}
                          @click=${this._removeSource}
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
                      "ui.panel.config.energy.solar.add_solar_production"
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
    showEnergySettingsSolarDialog(this, {
      info: this.info!,
      solar_sources: this.preferences.energy_sources.filter(
        (src) => src.type === "solar"
      ) as SolarSourceTypeEnergyPreference[],
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
      info: this.info!,
      source: { ...origSource },
      solar_sources: this.preferences.energy_sources.filter(
        (src) => src.type === "solar"
      ) as SolarSourceTypeEnergyPreference[],
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

  private async _removeSource(ev) {
    const sourceToRemove: SolarSourceTypeEnergyPreference =
      ev.currentTarget.closest(".row").source;

    if (
      !(await showConfirmationDialog(this, {
        title: this.hass.localize(
          "ui.panel.config.energy.solar.remove_solar_production_title"
        ),
        text: this.hass.localize(
          "ui.panel.config.energy.solar.remove_solar_production_text"
        ),
        confirmText: this.hass.localize("ui.common.remove"),
        destructive: true,
      }))
    ) {
      return;
    }

    try {
      await this._savePreferences({
        ...this.preferences,
        energy_sources: this.preferences.energy_sources.filter(
          (source) => source !== sourceToRemove
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
    "ha-energy-solar-settings": EnergySolarSettings;
  }
}
