import { mdiDelete, mdiPencil, mdiPlus, mdiTransmissionTower } from "@mdi/js";
import type { CSSResultGroup, TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-card";
import "../../../../components/ha-button";
import "../../../../components/ha-icon-button";
import "../../../../components/ha-svg-icon";
import type { ConfigEntry } from "../../../../data/config_entries";
import {
  deleteConfigEntry,
  getConfigEntries,
} from "../../../../data/config_entries";
import type {
  EnergyPreferences,
  EnergyPreferencesValidation,
  EnergyValidationIssue,
  GridSourceTypeEnergyPreference,
} from "../../../../data/energy";
import { saveEnergyPreferences } from "../../../../data/energy";
import type { StatisticsMetaData } from "../../../../data/recorder";
import { getStatisticLabel } from "../../../../data/recorder";
import { showConfigFlowDialog } from "../../../../dialogs/config-flow/show-dialog-config-flow";
import {
  showAlertDialog,
  showConfirmationDialog,
} from "../../../../dialogs/generic/show-dialog-box";
import { haStyle } from "../../../../resources/styles";
import type { HomeAssistant } from "../../../../types";
import { brandsUrl } from "../../../../util/brands-url";
import { documentationUrl } from "../../../../util/documentation-url";
import { showEnergySettingsGridDialog } from "../dialogs/show-dialogs-energy";
import "./ha-energy-validation-result";
import { energyCardStyles } from "./styles";

@customElement("ha-energy-grid-settings")
export class EnergyGridSettings extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false })
  public preferences!: EnergyPreferences;

  @property({ attribute: false })
  public statsMetadata?: Record<string, StatisticsMetaData>;

  @property({ attribute: false })
  public validationResult?: EnergyPreferencesValidation;

  @state() private _co2ConfigEntry?: ConfigEntry;

  protected firstUpdated() {
    this._fetchCO2SignalConfigEntries();
  }

  protected render(): TemplateResult {
    const gridSources: GridSourceTypeEnergyPreference[] = [];
    const gridValidation: EnergyValidationIssue[][] = [];

    this.preferences.energy_sources.forEach((source, idx) => {
      if (source.type !== "grid") {
        return;
      }
      gridSources.push(source);

      if (this.validationResult) {
        gridValidation.push(this.validationResult.energy_sources[idx]);
      }
    });

    return html`
      <ha-card>
        <h1 class="card-header">
          <ha-svg-icon .path=${mdiTransmissionTower}></ha-svg-icon>
          ${this.hass.localize("ui.panel.config.energy.grid.title")}
        </h1>

        <div class="card-content">
          <p>
            ${this.hass.localize("ui.panel.config.energy.grid.sub")}
            <a
              target="_blank"
              rel="noopener noreferrer"
              href=${documentationUrl(
                this.hass,
                "/docs/energy/electricity-grid/"
              )}
              >${this.hass.localize(
                "ui.panel.config.energy.grid.learn_more"
              )}</a
            >
          </p>
          ${gridValidation.map(
            (result) => html`
              <ha-energy-validation-result
                .hass=${this.hass}
                .issues=${result}
              ></ha-energy-validation-result>
            `
          )}

          <h3>
            ${this.hass.localize(
              "ui.panel.config.energy.grid.grid_connections"
            )}
          </h3>
          ${gridSources.length > 0
            ? html`
                <div class="items-container">
                  ${gridSources.map((source, idx) => {
                    // At least one of import/export/power must exist (enforced by validation)
                    const primaryStat = (source.stat_energy_from ||
                      source.stat_energy_to ||
                      source.stat_rate)!;
                    const primaryEntityState = this.hass.states[primaryStat];
                    return html`
                      <div class="row" .source=${source} .sourceIndex=${idx}>
                        ${primaryEntityState?.attributes.icon
                          ? html`<ha-icon
                              .icon=${primaryEntityState.attributes.icon}
                            ></ha-icon>`
                          : html`<ha-svg-icon
                              .path=${mdiTransmissionTower}
                            ></ha-svg-icon>`}
                        <div class="content">
                          <span class="label"
                            >${getStatisticLabel(
                              this.hass,
                              primaryStat,
                              this.statsMetadata?.[primaryStat]
                            )}</span
                          >
                          ${source.stat_energy_from && source.stat_energy_to
                            ? html`<span class="label secondary"
                                >${getStatisticLabel(
                                  this.hass,
                                  source.stat_energy_to,
                                  this.statsMetadata?.[source.stat_energy_to]
                                )}</span
                              >`
                            : nothing}
                        </div>
                        <ha-icon-button
                          .label=${this.hass.localize(
                            "ui.panel.config.energy.grid.edit_connection"
                          )}
                          @click=${this._editSource}
                          .path=${mdiPencil}
                        ></ha-icon-button>
                        <ha-icon-button
                          .label=${this.hass.localize(
                            "ui.panel.config.energy.grid.delete_connection"
                          )}
                          @click=${this._deleteSource}
                          .path=${mdiDelete}
                        ></ha-icon-button>
                      </div>
                    `;
                  })}
                </div>
              `
            : nothing}
          <div class="row">
            <ha-button
              @click=${this._addSource}
              appearance="filled"
              size="small"
            >
              <ha-svg-icon .path=${mdiPlus} slot="start"></ha-svg-icon>
              ${this.hass.localize(
                "ui.panel.config.energy.grid.add_connection"
              )}</ha-button
            >
          </div>

          <h3>
            ${this.hass.localize(
              "ui.panel.config.energy.grid.grid_carbon_footprint"
            )}
          </h3>
          ${this._co2ConfigEntry
            ? html`
                <div class="items-container">
                  <div class="row" .entry=${this._co2ConfigEntry}>
                    <img
                      alt=""
                      crossorigin="anonymous"
                      referrerpolicy="no-referrer"
                      src=${brandsUrl({
                        domain: "co2signal",
                        type: "icon",
                        darkOptimized: this.hass.themes?.darkMode,
                      })}
                    />
                    <span class="content">${this._co2ConfigEntry.title}</span>
                    <a
                      href=${`/config/integrations/integration/${this._co2ConfigEntry?.domain}`}
                    >
                      <ha-icon-button .path=${mdiPencil}></ha-icon-button>
                    </a>
                    <ha-icon-button
                      .label=${this.hass.localize(
                        "ui.panel.config.energy.grid.remove_co2_signal"
                      )}
                      @click=${this._removeCO2Sensor}
                      .path=${mdiDelete}
                    ></ha-icon-button>
                  </div>
                </div>
              `
            : html`
                <div class="row">
                  <ha-button
                    @click=${this._addCO2Sensor}
                    appearance="filled"
                    size="small"
                  >
                    <ha-svg-icon .path=${mdiPlus} slot="start"></ha-svg-icon>
                    ${this.hass.localize(
                      "ui.panel.config.energy.grid.add_co2_signal"
                    )}
                  </ha-button>
                </div>
              `}
        </div>
      </ha-card>
    `;
  }

  private async _fetchCO2SignalConfigEntries() {
    const entries = await getConfigEntries(this.hass, { domain: "co2signal" });
    this._co2ConfigEntry = entries.length ? entries[0] : undefined;
  }

  private _addCO2Sensor() {
    showConfigFlowDialog(this, {
      startFlowHandler: "co2signal",
      dialogClosedCallback: () => {
        this._fetchCO2SignalConfigEntries();
      },
    });
  }

  private async _removeCO2Sensor(ev) {
    const entryId = ev.currentTarget.closest(".row").entry.entry_id;
    if (
      !(await showConfirmationDialog(this, {
        title: this.hass.localize("ui.panel.config.energy.delete_integration"),
      }))
    ) {
      return;
    }

    await deleteConfigEntry(this.hass, entryId);
    this._fetchCO2SignalConfigEntries();
  }

  private _getGridSources(): GridSourceTypeEnergyPreference[] {
    return this.preferences.energy_sources.filter(
      (src): src is GridSourceTypeEnergyPreference => src.type === "grid"
    );
  }

  private _addSource() {
    showEnergySettingsGridDialog(this, {
      grid_sources: this._getGridSources(),
      saveCallback: async (source) => {
        const preferences: EnergyPreferences = {
          ...this.preferences,
          energy_sources: [...this.preferences.energy_sources, source],
        };
        await this._savePreferences(preferences);
      },
    });
  }

  private _editSource(ev) {
    const row = ev.currentTarget.closest(".row");
    const origSource: GridSourceTypeEnergyPreference = row.source;
    const sourceIndex: number = row.sourceIndex;

    showEnergySettingsGridDialog(this, {
      source: { ...origSource },
      grid_sources: this._getGridSources(),
      saveCallback: async (newSource) => {
        const nonGridSources = this.preferences.energy_sources.filter(
          (src) => src.type !== "grid"
        );
        const updatedGrids = this._getGridSources().map((src, idx) =>
          idx === sourceIndex ? newSource : src
        );

        const preferences: EnergyPreferences = {
          ...this.preferences,
          energy_sources: [...nonGridSources, ...updatedGrids],
        };
        await this._savePreferences(preferences);
      },
    });
  }

  private async _deleteSource(ev) {
    const row = ev.currentTarget.closest(".row");
    const sourceIndex: number = row.sourceIndex;

    if (
      !(await showConfirmationDialog(this, {
        title: this.hass.localize("ui.panel.config.energy.delete_source"),
      }))
    ) {
      return;
    }

    const nonGridSources = this.preferences.energy_sources.filter(
      (src) => src.type !== "grid"
    );
    const updatedGrids = this._getGridSources().filter(
      (_, idx) => idx !== sourceIndex
    );

    const preferences: EnergyPreferences = {
      ...this.preferences,
      energy_sources: [...nonGridSources, ...updatedGrids],
    };
    await this._savePreferences(preferences);
  }

  private async _savePreferences(preferences: EnergyPreferences) {
    try {
      const result = await saveEnergyPreferences(this.hass, preferences);
      fireEvent(this, "value-changed", { value: result });
    } catch (err: any) {
      showAlertDialog(this, { title: `Failed to save config: ${err.message}` });
    }
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      energyCardStyles,
      css`
        .row {
          height: 58px;
        }
        .content {
          display: flex;
          flex-direction: column;
        }
        .label {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .label.secondary {
          color: var(--secondary-text-color);
          font-size: 0.9em;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-energy-grid-settings": EnergyGridSettings;
  }
}
