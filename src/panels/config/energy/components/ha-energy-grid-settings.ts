import {
  mdiDelete,
  mdiHomeExportOutline,
  mdiHomeImportOutline,
  mdiPencil,
  mdiPlus,
  mdiTransmissionTower,
} from "@mdi/js";
import type { CSSResultGroup, TemplateResult } from "lit";
import { html, LitElement } from "lit";
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
  EnergySource,
  FlowFromGridSourceEnergyPreference,
  FlowToGridSourceEnergyPreference,
  GridSourceTypeEnergyPreference,
} from "../../../../data/energy";
import {
  emptyGridSourceEnergyPreference,
  energySourcesByType,
  saveEnergyPreferences,
} from "../../../../data/energy";
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
import {
  showEnergySettingsGridFlowFromDialog,
  showEnergySettingsGridFlowToDialog,
} from "../dialogs/show-dialogs-energy";
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
    const gridIdx = this.preferences.energy_sources.findIndex(
      (source) => source.type === "grid"
    );

    let gridSource: GridSourceTypeEnergyPreference;
    let gridValidation: EnergyValidationIssue[] | undefined;

    if (gridIdx === -1) {
      gridSource = emptyGridSourceEnergyPreference();
    } else {
      gridSource = this.preferences.energy_sources[
        gridIdx
      ] as GridSourceTypeEnergyPreference;
      if (this.validationResult) {
        gridValidation = this.validationResult.energy_sources[gridIdx];
      }
    }

    return html`
      <ha-card outlined>
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
          ${gridValidation
            ? html`
                <ha-energy-validation-result
                  .hass=${this.hass}
                  .issues=${gridValidation}
                ></ha-energy-validation-result>
              `
            : ""}

          <h3>
            ${this.hass.localize(
              "ui.panel.config.energy.grid.grid_consumption"
            )}
          </h3>
          ${gridSource.flow_from.map((flow) => {
            const entityState = this.hass.states[flow.stat_energy_from];
            return html`
              <div class="row" .source=${flow}>
                ${entityState?.attributes.icon
                  ? html`<ha-icon
                      .icon=${entityState?.attributes.icon}
                    ></ha-icon>`
                  : html`<ha-svg-icon
                      .path=${mdiHomeImportOutline}
                    ></ha-svg-icon>`}
                <span class="content"
                  >${getStatisticLabel(
                    this.hass,
                    flow.stat_energy_from,
                    this.statsMetadata?.[flow.stat_energy_from]
                  )}</span
                >
                <ha-icon-button
                  .label=${this.hass.localize(
                    "ui.panel.config.energy.grid.edit_consumption"
                  )}
                  @click=${this._editFromSource}
                  .path=${mdiPencil}
                ></ha-icon-button>
                <ha-icon-button
                  .label=${this.hass.localize(
                    "ui.panel.config.energy.grid.delete_consumption"
                  )}
                  @click=${this._deleteFromSource}
                  .path=${mdiDelete}
                ></ha-icon-button>
              </div>
            `;
          })}
          <div class="row border-bottom">
            <ha-svg-icon .path=${mdiHomeImportOutline}></ha-svg-icon>
            <ha-button
              appearance="filled"
              size="small"
              @click=${this._addFromSource}
            >
              <ha-svg-icon .path=${mdiPlus} slot="prefix"></ha-svg-icon>
              ${this.hass.localize(
                "ui.panel.config.energy.grid.add_consumption"
              )}</ha-button
            >
          </div>

          <h3>
            ${this.hass.localize("ui.panel.config.energy.grid.return_to_grid")}
          </h3>
          ${gridSource.flow_to.map((flow) => {
            const entityState = this.hass.states[flow.stat_energy_to];
            return html`
              <div class="row" .source=${flow}>
                ${entityState?.attributes.icon
                  ? html`<ha-icon
                      .icon=${entityState.attributes.icon}
                    ></ha-icon>`
                  : html`<ha-svg-icon
                      .path=${mdiHomeExportOutline}
                    ></ha-svg-icon>`}
                <span class="content"
                  >${getStatisticLabel(
                    this.hass,
                    flow.stat_energy_to,
                    this.statsMetadata?.[flow.stat_energy_to]
                  )}</span
                >
                <ha-icon-button
                  .label=${this.hass.localize(
                    "ui.panel.config.energy.grid.edit_return"
                  )}
                  @click=${this._editToSource}
                  .path=${mdiPencil}
                ></ha-icon-button>
                <ha-icon-button
                  .label=${this.hass.localize(
                    "ui.panel.config.energy.grid.delete_return"
                  )}
                  @click=${this._deleteToSource}
                  .path=${mdiDelete}
                ></ha-icon-button>
              </div>
            `;
          })}
          <div class="row border-bottom">
            <ha-svg-icon .path=${mdiHomeExportOutline}></ha-svg-icon>
            <ha-button
              @click=${this._addToSource}
              appearance="filled"
              size="small"
            >
              <ha-svg-icon .path=${mdiPlus} slot="prefix"></ha-svg-icon
              >${this.hass.localize(
                "ui.panel.config.energy.grid.add_return"
              )}</ha-button
            >
          </div>

          <h3>
            ${this.hass.localize(
              "ui.panel.config.energy.grid.grid_carbon_footprint"
            )}
          </h3>
          ${this._co2ConfigEntry
            ? html`<div class="row" .entry=${this._co2ConfigEntry}>
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
              </div>`
            : html`
                <div class="row border-bottom">
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
                  <ha-button
                    @click=${this._addCO2Sensor}
                    appearance="filled"
                    size="small"
                  >
                    <ha-svg-icon .path=${mdiPlus} slot="prefix"></ha-svg-icon>
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

  private _addFromSource() {
    const gridSource = this.preferences.energy_sources.find(
      (src) => src.type === "grid"
    ) as GridSourceTypeEnergyPreference | undefined;
    showEnergySettingsGridFlowFromDialog(this, {
      grid_source: gridSource,
      saveCallback: async (flow) => {
        let preferences: EnergyPreferences;
        if (!gridSource) {
          preferences = {
            ...this.preferences,
            energy_sources: [
              ...this.preferences.energy_sources,
              {
                ...emptyGridSourceEnergyPreference(),
                flow_from: [flow],
              },
            ],
          };
        } else {
          preferences = {
            ...this.preferences,
            energy_sources: this.preferences.energy_sources.map((src) =>
              src.type === "grid"
                ? { ...src, flow_from: [...gridSource.flow_from, flow] }
                : src
            ),
          };
        }
        await this._savePreferences(preferences);
      },
    });
  }

  private _addToSource() {
    const gridSource = this.preferences.energy_sources.find(
      (src) => src.type === "grid"
    ) as GridSourceTypeEnergyPreference | undefined;
    showEnergySettingsGridFlowToDialog(this, {
      grid_source: gridSource,
      saveCallback: async (flow) => {
        let preferences: EnergyPreferences;
        if (!gridSource) {
          preferences = {
            ...this.preferences,
            energy_sources: [
              ...this.preferences.energy_sources,
              {
                ...emptyGridSourceEnergyPreference(),
                flow_to: [flow],
              },
            ],
          };
        } else {
          preferences = {
            ...this.preferences,
            energy_sources: this.preferences.energy_sources.map((src) =>
              src.type === "grid"
                ? { ...src, flow_to: [...gridSource.flow_to, flow] }
                : src
            ),
          };
        }
        await this._savePreferences(preferences);
      },
    });
  }

  private _editFromSource(ev) {
    const origSource: FlowFromGridSourceEnergyPreference =
      ev.currentTarget.closest(".row").source;
    const gridSource = this.preferences.energy_sources.find(
      (src) => src.type === "grid"
    ) as GridSourceTypeEnergyPreference | undefined;
    showEnergySettingsGridFlowFromDialog(this, {
      source: { ...origSource },
      grid_source: gridSource,
      metadata: this.statsMetadata?.[origSource.stat_energy_from],
      saveCallback: async (source) => {
        const flowFrom = energySourcesByType(this.preferences).grid![0]
          .flow_from;

        const preferences: EnergyPreferences = {
          ...this.preferences,
          energy_sources: this.preferences.energy_sources.map((src) =>
            src.type === "grid"
              ? {
                  ...src,
                  flow_from: flowFrom.map((flow) =>
                    flow === origSource ? source : flow
                  ),
                }
              : src
          ),
        };
        await this._savePreferences(preferences);
      },
    });
  }

  private _editToSource(ev) {
    const origSource: FlowToGridSourceEnergyPreference =
      ev.currentTarget.closest(".row").source;
    const gridSource = this.preferences.energy_sources.find(
      (src) => src.type === "grid"
    ) as GridSourceTypeEnergyPreference | undefined;
    showEnergySettingsGridFlowToDialog(this, {
      source: { ...origSource },
      grid_source: gridSource,
      metadata: this.statsMetadata?.[origSource.stat_energy_to],
      saveCallback: async (source) => {
        const flowTo = energySourcesByType(this.preferences).grid![0].flow_to;

        const preferences: EnergyPreferences = {
          ...this.preferences,
          energy_sources: this.preferences.energy_sources.map((src) =>
            src.type === "grid"
              ? {
                  ...src,
                  flow_to: flowTo.map((flow) =>
                    flow === origSource ? source : flow
                  ),
                }
              : src
          ),
        };
        await this._savePreferences(preferences);
      },
    });
  }

  private async _deleteFromSource(ev) {
    const sourceToDelete: FlowFromGridSourceEnergyPreference =
      ev.currentTarget.closest(".row").source;

    if (
      !(await showConfirmationDialog(this, {
        title: this.hass.localize("ui.panel.config.energy.delete_source"),
      }))
    ) {
      return;
    }

    const flowFrom = energySourcesByType(
      this.preferences
    ).grid![0].flow_from.filter((flow) => flow !== sourceToDelete);

    const preferences: EnergyPreferences = {
      ...this.preferences,
      energy_sources: this.preferences.energy_sources.map((source) =>
        source.type === "grid" ? { ...source, flow_from: flowFrom } : source
      ),
    };

    const cleanedPreferences = this._removeEmptySources(preferences);
    await this._savePreferences(cleanedPreferences);
  }

  private async _deleteToSource(ev) {
    const sourceToDelete: FlowToGridSourceEnergyPreference =
      ev.currentTarget.closest(".row").source;

    if (
      !(await showConfirmationDialog(this, {
        title: this.hass.localize("ui.panel.config.energy.delete_source"),
      }))
    ) {
      return;
    }

    const flowTo = energySourcesByType(
      this.preferences
    ).grid![0].flow_to.filter((flow) => flow !== sourceToDelete);

    const preferences: EnergyPreferences = {
      ...this.preferences,
      energy_sources: this.preferences.energy_sources.map((source) =>
        source.type === "grid" ? { ...source, flow_to: flowTo } : source
      ),
    };

    const cleanedPreferences = this._removeEmptySources(preferences);
    await this._savePreferences(cleanedPreferences);
  }

  private _removeEmptySources(preferences: EnergyPreferences) {
    // Check if grid sources became an empty type and remove if so
    preferences.energy_sources = preferences.energy_sources.reduce<
      EnergySource[]
    >((acc, source) => {
      if (
        source.type !== "grid" ||
        source.flow_from.length > 0 ||
        source.flow_to.length > 0
      ) {
        acc.push(source);
      }
      return acc;
    }, []);

    return preferences;
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
    return [haStyle, energyCardStyles];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-energy-grid-settings": EnergyGridSettings;
  }
}
