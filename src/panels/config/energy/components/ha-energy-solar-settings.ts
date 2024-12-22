import "@material/mwc-button/mwc-button";
import { mdiDelete, mdiPencil, mdiSolarPower } from "@mdi/js";
import { CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-card";
import "../../../../components/ha-icon-button";
import {
  EnergyInfo,
  EnergyPreferences,
  EnergyPreferencesValidation,
  EnergyValidationIssue,
  saveEnergyPreferences,
  SolarSourceTypeEnergyPreference,
} from "../../../../data/energy";
import {
  StatisticsMetaData,
  getStatisticLabel,
} from "../../../../data/recorder";
import {
  showConfirmationDialog,
  showAlertDialog,
} from "../../../../dialogs/generic/show-dialog-box";
import { haStyle } from "../../../../resources/styles";
import { HomeAssistant } from "../../../../types";
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
      <ha-card outlined>
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

          <h3>
            ${this.hass.localize(
              "ui.panel.config.energy.solar.solar_production"
            )}
          </h3>
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
                    "ui.panel.config.energy.solar.delete_solar_production"
                  )}
                  @click=${this._deleteSource}
                  .path=${mdiDelete}
                ></ha-icon-button>
              </div>
            `;
          })}
          ${this.info
            ? html`
                <div class="row border-bottom">
                  <ha-svg-icon .path=${mdiSolarPower}></ha-svg-icon>
                  <mwc-button @click=${this._addSource}>
                    ${this.hass.localize(
                      "ui.panel.config.energy.solar.add_solar_production"
                    )}
                  </mwc-button>
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

  private async _deleteSource(ev) {
    const sourceToDelete: SolarSourceTypeEnergyPreference =
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
    "ha-energy-solar-settings": EnergySolarSettings;
  }
}
