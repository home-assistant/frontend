import "@material/mwc-button/mwc-button";
import { mdiDelete, mdiFire, mdiPencil } from "@mdi/js";
import { CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-card";
import "../../../../components/ha-icon-button";
import {
  EnergyPreferences,
  EnergyPreferencesValidation,
  EnergyValidationIssue,
  GasSourceTypeEnergyPreference,
  getEnergyGasUnitClass,
  saveEnergyPreferences,
} from "../../../../data/energy";
import {
  StatisticsMetaData,
  getStatisticLabel,
} from "../../../../data/recorder";
import {
  showAlertDialog,
  showConfirmationDialog,
} from "../../../../dialogs/generic/show-dialog-box";
import { haStyle } from "../../../../resources/styles";
import { HomeAssistant } from "../../../../types";
import { documentationUrl } from "../../../../util/documentation-url";
import { showEnergySettingsGasDialog } from "../dialogs/show-dialogs-energy";
import "./ha-energy-validation-result";
import { energyCardStyles } from "./styles";

@customElement("ha-energy-gas-settings")
export class EnergyGasSettings extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false })
  public preferences!: EnergyPreferences;

  @property({ attribute: false })
  public statsMetadata?: Record<string, StatisticsMetaData>;

  @property({ attribute: false })
  public validationResult?: EnergyPreferencesValidation;

  protected render(): TemplateResult {
    const gasSources: GasSourceTypeEnergyPreference[] = [];
    const gasValidation: EnergyValidationIssue[][] = [];

    this.preferences.energy_sources.forEach((source, idx) => {
      if (source.type !== "gas") {
        return;
      }
      gasSources.push(source);

      if (this.validationResult) {
        gasValidation.push(this.validationResult.energy_sources[idx]);
      }
    });

    return html`
      <ha-card outlined>
        <h1 class="card-header">
          <ha-svg-icon .path=${mdiFire}></ha-svg-icon>
          ${this.hass.localize("ui.panel.config.energy.gas.title")}
        </h1>

        <div class="card-content">
          <p>
            ${this.hass.localize("ui.panel.config.energy.gas.sub")}
            <a
              target="_blank"
              rel="noopener noreferrer"
              href=${documentationUrl(this.hass, "/docs/energy/gas/")}
              >${this.hass.localize("ui.panel.config.energy.gas.learn_more")}</a
            >
          </p>
          ${gasValidation.map(
            (result) => html`
              <ha-energy-validation-result
                .hass=${this.hass}
                .issues=${result}
              ></ha-energy-validation-result>
            `
          )}
          <h3>
            ${this.hass.localize("ui.panel.config.energy.gas.gas_consumption")}
          </h3>
          ${gasSources.map((source) => {
            const entityState = this.hass.states[source.stat_energy_from];
            return html`
              <div class="row" .source=${source}>
                ${entityState?.attributes.icon
                  ? html`<ha-icon
                      .icon=${entityState.attributes.icon}
                    ></ha-icon>`
                  : html`<ha-svg-icon .path=${mdiFire}></ha-svg-icon>`}
                <span class="content"
                  >${getStatisticLabel(
                    this.hass,
                    source.stat_energy_from,
                    this.statsMetadata?.[source.stat_energy_from]
                  )}</span
                >
                <ha-icon-button
                  .label=${this.hass.localize(
                    "ui.panel.config.energy.gas.edit_gas_source"
                  )}
                  @click=${this._editSource}
                  .path=${mdiPencil}
                ></ha-icon-button>
                <ha-icon-button
                  .label=${this.hass.localize(
                    "ui.panel.config.energy.gas.delete_gas_source"
                  )}
                  @click=${this._deleteSource}
                  .path=${mdiDelete}
                ></ha-icon-button>
              </div>
            `;
          })}
          <div class="row border-bottom">
            <ha-svg-icon .path=${mdiFire}></ha-svg-icon>
            <mwc-button @click=${this._addSource}
              >${this.hass.localize(
                "ui.panel.config.energy.gas.add_gas_source"
              )}</mwc-button
            >
          </div>
        </div>
      </ha-card>
    `;
  }

  private _addSource() {
    showEnergySettingsGasDialog(this, {
      allowedGasUnitClass: getEnergyGasUnitClass(
        this.preferences,
        this.statsMetadata
      ),
      gas_sources: this.preferences.energy_sources.filter(
        (src) => src.type === "gas"
      ) as GasSourceTypeEnergyPreference[],
      saveCallback: async (source) => {
        delete source.unit_of_measurement;
        await this._savePreferences({
          ...this.preferences,
          energy_sources: this.preferences.energy_sources.concat(source),
        });
      },
    });
  }

  private _editSource(ev) {
    const origSource: GasSourceTypeEnergyPreference =
      ev.currentTarget.closest(".row").source;
    showEnergySettingsGasDialog(this, {
      source: { ...origSource },
      allowedGasUnitClass: getEnergyGasUnitClass(
        this.preferences,
        this.statsMetadata,
        origSource.stat_energy_from
      ),
      metadata: this.statsMetadata?.[origSource.stat_energy_from],
      gas_sources: this.preferences.energy_sources.filter(
        (src) => src.type === "gas"
      ) as GasSourceTypeEnergyPreference[],
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
    const sourceToDelete: GasSourceTypeEnergyPreference =
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
    "ha-energy-gas-settings": EnergyGasSettings;
  }
}
