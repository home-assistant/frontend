import { mdiCarElectric, mdiDelete, mdiPencil, mdiPlus } from "@mdi/js";
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
  EVSourceTypeEnergyPreference,
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
import { showEnergySettingsEVDialog } from "../dialogs/show-dialogs-energy";
import "./ha-energy-validation-result";
import { energyCardStyles } from "./styles";

@customElement("ha-energy-ev-settings")
export class EnergyEVSettings extends LitElement {
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
    const evSources: EVSourceTypeEnergyPreference[] = [];
    const evValidation: EnergyValidationIssue[][] = [];

    this.preferences.energy_sources.forEach((source, idx) => {
      if (source.type !== "ev") {
        return;
      }
      evSources.push(source);

      if (this.validationResult) {
        evValidation.push(this.validationResult.energy_sources[idx]);
      }
    });

    return html`
      <ha-card>
        <h1 class="card-header">
          <ha-svg-icon .path=${mdiCarElectric}></ha-svg-icon>
          ${this.hass.localize("ui.panel.config.energy.ev.title")}
        </h1>

        <div class="card-content">
          <p>${this.hass.localize("ui.panel.config.energy.ev.sub")}</p>
          ${evValidation.map(
            (result) => html`
              <ha-energy-validation-result
                .hass=${this.hass}
                .issues=${result}
              ></ha-energy-validation-result>
            `
          )}
          ${
            evSources.length > 0
              ? html`
                  <div class="items-container">
                    ${evSources.map((source) => {
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
                                  .path=${mdiCarElectric}
                                ></ha-svg-icon>`
                          }
                          <span class="content"
                            >${
                              source.name ||
                              getStatisticLabel(
                                this.hass,
                                source.stat_energy_from,
                                this.statsMetadata?.[source.stat_energy_from]
                              )
                            }</span
                          >
                          ${
                            this.info
                              ? html`
                                  <ha-icon-button
                                    .label=${this.hass.localize(
                                      "ui.panel.config.energy.ev.edit_ev"
                                    )}
                                    @click=${this._editSource}
                                    .path=${mdiPencil}
                                  ></ha-icon-button>
                                `
                              : ""
                          }
                          <ha-icon-button
                            .label=${this.hass.localize(
                              "ui.panel.config.energy.ev.delete_ev"
                            )}
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
          ${
            this.info
              ? html`
                  <div class="row">
                    <ha-button
                      @click=${this._addSource}
                      appearance="filled"
                      size="s"
                    >
                      <ha-svg-icon slot="start" .path=${mdiPlus}></ha-svg-icon>
                      ${this.hass.localize("ui.panel.config.energy.ev.add_ev")}
                    </ha-button>
                  </div>
                `
              : ""
          }
        </div>
      </ha-card>
    `;
  }

  private _addSource() {
    showEnergySettingsEVDialog(this, {
      statsMetadata: this.statsMetadata,
      info: this.info!,
      ev_sources: this.preferences.energy_sources.filter(
        (src) => src.type === "ev"
      ) as EVSourceTypeEnergyPreference[],
      saveCallback: async (source) => {
        await this._savePreferences({
          ...this.preferences,
          energy_sources: this.preferences.energy_sources.concat(source),
        });
      },
    });
  }

  private _editSource(ev) {
    const origSource: EVSourceTypeEnergyPreference =
      ev.currentTarget.closest(".row").source;
    showEnergySettingsEVDialog(this, {
      statsMetadata: this.statsMetadata,
      info: this.info!,
      source: { ...origSource },
      ev_sources: this.preferences.energy_sources.filter(
        (src) => src.type === "ev"
      ) as EVSourceTypeEnergyPreference[],
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
    const sourceToDelete: EVSourceTypeEnergyPreference =
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
    "ha-energy-ev-settings": EnergyEVSettings;
  }
}
