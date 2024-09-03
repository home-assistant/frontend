import "@material/mwc-button/mwc-button";
import { mdiDelete, mdiPlus, mdiPencil } from "@mdi/js";
import { CSSResultGroup, html, LitElement, nothing, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-card";
import "../../../../components/ha-icon-button";
import {
  EnergyPreferences,
  EnergyPreferencesValidation,
  EnergyValidationIssue,
  saveEnergyPreferences,
  GenericSourceTypeEnergyPreference,
} from "../../../../data/energy";
import {
  StatisticsMetaData,
  getStatisticLabel,
} from "../../../../data/recorder";
import {
  showAlertDialog,
  showConfirmationDialog,
} from "../../../../dialogs/generic/show-dialog-box";
import { capitalizeFirstLetter } from "../../../../common/string/capitalize-first-letter";
import { haStyle } from "../../../../resources/styles";
import { HomeAssistant } from "../../../../types";
import { showEnergySettingsGenericDialog } from "../dialogs/show-dialogs-energy";
import "./ha-energy-validation-result";
import { energyCardStyles } from "./styles";

@customElement("ha-energy-generic-settings")
export class EnergyGenericSettings extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public energyType!: string;

  @property({ attribute: false })
  public preferences!: EnergyPreferences;

  @property({ attribute: false })
  public statsMetadata?: Record<string, StatisticsMetaData>;

  @property({ attribute: false })
  public validationResult?: EnergyPreferencesValidation;

  private unit?: string | null;

  private unitClass?: string | null;

  protected render(): TemplateResult {
    const genericSources: GenericSourceTypeEnergyPreference[] = [];
    const genericValidation: EnergyValidationIssue[][] = [];

    this.preferences.energy_sources.forEach((source, idx) => {
      if (source.type !== "custom" || source.custom_type !== this.energyType) {
        return;
      }
      genericSources.push(source);

      if (this.validationResult) {
        genericValidation.push(this.validationResult.energy_sources[idx]);
      }
    });

    this.unitClass =
      this.statsMetadata?.[genericSources[0]?.stat_energy_from]?.unit_class;
    if (!this.unitClass) {
      this.unit =
        this.statsMetadata?.[
          genericSources[0]?.stat_energy_from
        ]?.statistics_unit_of_measurement;
    } else {
      this.unit = undefined;
    }

    return html`
      <ha-card outlined>
        <h1 class="card-header">
          ${capitalizeFirstLetter(this.energyType.replaceAll("_", " "))}
        </h1>

        <div class="card-content">
          <p>
            ${this.hass.localize("ui.panel.config.energy.generic.sub", {
              type: this.energyType.replaceAll("_", " "),
            })}
          </p>
          ${genericValidation.map(
            (result) => html`
              <ha-energy-validation-result
                .hass=${this.hass}
                .issues=${result}
              ></ha-energy-validation-result>
            `
          )}
          <h3>
            ${capitalizeFirstLetter(this.energyType.replaceAll("_", " "))}
          </h3>
          ${genericSources.map((source) => {
            const entityState = this.hass.states[source.stat_energy_from];
            return html`
              <div class="row" .source=${source}>
                ${entityState?.attributes.icon
                  ? html`<ha-icon
                      .icon=${entityState.attributes.icon}
                    ></ha-icon>`
                  : nothing}
                <span class="content"
                  >${getStatisticLabel(
                    this.hass,
                    source.stat_energy_from,
                    this.statsMetadata?.[source.stat_energy_from]
                  )}</span
                >
                <ha-icon-button
                  .label=${this.hass.localize(
                    "ui.panel.config.energy.generic.edit_generic_source",
                    { type: this.energyType.replaceAll("_", " ") }
                  )}
                  @click=${this._editSource}
                  .path=${mdiPencil}
                ></ha-icon-button>
                <ha-icon-button
                  .label=${this.hass.localize(
                    "ui.panel.config.energy.generic.delete_generic_source",
                    { type: this.energyType.replaceAll("_", " ") }
                  )}
                  @click=${this._deleteSource}
                  .path=${mdiDelete}
                ></ha-icon-button>
              </div>
            `;
          })}
          <div class="row border-bottom">
            <ha-svg-icon .path=${mdiPlus}></ha-svg-icon>
            <mwc-button @click=${this._addSource}
              >${this.hass.localize(
                "ui.panel.config.energy.generic.add_generic_source",
                { type: this.energyType.replaceAll("_", " ") }
              )}</mwc-button
            >
          </div>
        </div>
      </ha-card>
    `;
  }

  private _addSource() {
    showEnergySettingsGenericDialog(this, {
      generic_sources: this.preferences.energy_sources.filter(
        (src) => src.type === "custom" && src.custom_type === this.energyType
      ) as GenericSourceTypeEnergyPreference[],
      energyType: this.energyType,
      unit: this.unit,
      unitClass: this.unitClass,
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
    const origSource: GenericSourceTypeEnergyPreference =
      ev.currentTarget.closest(".row").source;
    const generic_sources = this.preferences.energy_sources.filter(
      (src) => src.type === "custom" && src.custom_type === this.energyType
    ) as GenericSourceTypeEnergyPreference[];
    showEnergySettingsGenericDialog(this, {
      source: { ...origSource },
      metadata: this.statsMetadata?.[origSource.stat_energy_from],
      energyType: this.energyType,
      unit: generic_sources.length === 1 ? undefined : this.unit,
      unitClass: generic_sources.length === 1 ? undefined : this.unitClass,
      generic_sources,
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
    const sourceToDelete: GenericSourceTypeEnergyPreference =
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
    "ha-energy-generic-settings": EnergyGenericSettings;
  }
}
