import { mdiDelete, mdiFire, mdiPencil, mdiPlus, mdiRadiator } from "@mdi/js";
import type { CSSResultGroup, TemplateResult } from "lit";
import { html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../../../../common/dom/fire_event";
import type { LocalizeKeys } from "../../../../common/translations/localize";
import "../../../../components/ha-button";
import "../../../../components/ha-card";
import "../../../../components/ha-icon-button";
import type {
  EnergyPreferences,
  EnergyPreferencesValidation,
  EnergyValidationIssue,
  GasSourceTypeEnergyPreference,
  HeatSourceTypeEnergyPreference,
} from "../../../../data/energy";
import {
  getEnergyGasUnitClass,
  saveEnergyPreferences,
} from "../../../../data/energy";
import type { StatisticsMetaData } from "../../../../data/recorder";
import { getStatisticLabel } from "../../../../data/recorder";
import {
  showAlertDialog,
  showConfirmationDialog,
} from "../../../../dialogs/generic/show-dialog-box";
import { haStyle } from "../../../../resources/styles";
import type { HomeAssistant } from "../../../../types";
import { documentationUrl } from "../../../../util/documentation-url";
import { showEnergySettingsGasDialog } from "../dialogs/show-dialogs-energy";
import "./ha-energy-validation-result";
import { energyCardStyles } from "./styles";

type GasOrHeatSource =
  | GasSourceTypeEnergyPreference
  | HeatSourceTypeEnergyPreference;

@customElement("ha-energy-gas-settings")
export class EnergyGasSettings extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: "source-type" }) public sourceType: "gas" | "heat" = "gas";

  @property({ attribute: false })
  public preferences!: EnergyPreferences;

  @property({ attribute: false })
  public statsMetadata?: Record<string, StatisticsMetaData>;

  @property({ attribute: false })
  public validationResult?: EnergyPreferencesValidation;

  protected render(): TemplateResult {
    const gasSources: GasOrHeatSource[] = [];
    const gasValidation: EnergyValidationIssue[][] = [];

    this.preferences.energy_sources.forEach((source, idx) => {
      if (source.type !== this.sourceType) {
        return;
      }
      gasSources.push(source);

      if (this.validationResult) {
        gasValidation.push(this.validationResult.energy_sources[idx]);
      }
    });

    return html`
      <ha-card>
        <h1 class="card-header">
          <ha-svg-icon
            .path=${this.sourceType === "heat" ? mdiRadiator : mdiFire}
          ></ha-svg-icon>
          ${this._localize("title")}
        </h1>

        <div class="card-content">
          <p>
            ${this._localize("sub")}
            <a
              target="_blank"
              rel="noopener noreferrer"
              href=${documentationUrl(
                this.hass,
                this.sourceType === "heat" ? "/docs/energy/" : "/docs/energy/gas/"
              )}
              >${this._localize("learn_more")}</a
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
          ${
            gasSources.length > 0
              ? html`
                  <div class="items-container">
                    ${gasSources.map((source) => {
                      const entityState =
                        this.hass.states[source.stat_energy_from];
                      return html`
                        <div class="row" .source=${source}>
                          ${
                            entityState?.attributes.icon
                              ? html`<ha-icon
                                  .icon=${entityState.attributes.icon}
                                ></ha-icon>`
                              : html`<ha-svg-icon
                                  .path=${this.sourceType === "heat" ? mdiRadiator : mdiFire}
                                ></ha-svg-icon>`
                          }
                          <span class="content"
                            >${
                              source.name ||
                              getStatisticLabel(
                                this.hass.states,
                                this.hass.formatEntityName,
                                source.stat_energy_from,
                                this.statsMetadata?.[source.stat_energy_from]
                              )
                            }</span
                          >
                          <ha-icon-button
                            .label=${this._localize("edit_source")}
                            @click=${this._editSource}
                            .path=${mdiPencil}
                          ></ha-icon-button>
                          <ha-icon-button
                            .label=${this._localize("delete_source")}
                            @click=${this._deleteSource}
                            .path=${mdiDelete}
                          ></ha-icon-button>
                        </div>
                      `;
                    })}
                  </div>
                `
              : ""
          }
          <div class="row">
            <ha-button @click=${this._addSource} appearance="filled" size="s">
              <ha-svg-icon slot="start" .path=${mdiPlus}></ha-svg-icon
              >${this._localize("add_source")}</ha-button
            >
          </div>
        </div>
      </ha-card>
    `;
  }

  private _addSource() {
    showEnergySettingsGasDialog(this, {
      source_type: this.sourceType,
      statsMetadata: this.statsMetadata,
      allowedGasUnitClass:
        this.sourceType === "gas"
          ? getEnergyGasUnitClass(
              this.preferences,
              undefined,
              this.statsMetadata
            )
          : "energy",
      gas_sources: this.preferences.energy_sources.filter(
        (src) => src.type === "gas"
      ) as GasSourceTypeEnergyPreference[],
      heat_sources: this.preferences.energy_sources.filter(
        (src) => src.type === "heat"
      ) as HeatSourceTypeEnergyPreference[],
      saveCallback: async (source) => {
        if ("unit_of_measurement" in source) {
          delete source.unit_of_measurement;
        }
        await this._savePreferences({
          ...this.preferences,
          energy_sources: this.preferences.energy_sources.concat(source),
        });
      },
    });
  }

  private _editSource(ev) {
    const origSource: GasOrHeatSource = ev.currentTarget.closest(".row").source;
    showEnergySettingsGasDialog(this, {
      source_type: this.sourceType,
      source: { ...origSource },
      statsMetadata: this.statsMetadata,
      allowedGasUnitClass:
        this.sourceType === "gas"
          ? getEnergyGasUnitClass(
              this.preferences,
              origSource.stat_energy_from,
              this.statsMetadata
            )
          : "energy",
      gas_sources: this.preferences.energy_sources.filter(
        (src) => src.type === "gas"
      ) as GasSourceTypeEnergyPreference[],
      heat_sources: this.preferences.energy_sources.filter(
        (src) => src.type === "heat"
      ) as HeatSourceTypeEnergyPreference[],
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
    const sourceToDelete: GasOrHeatSource = ev.currentTarget.closest(".row").source;

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

  private _localize(key: string): string {
    return this.hass.localize(
      `ui.panel.config.energy.${this.sourceType}.${key}` as LocalizeKeys
    );
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
