import { mdiDelete, mdiPlus, mdiTransmissionTower } from "@mdi/js";
import type { CSSResultGroup, PropertyValues, TemplateResult } from "lit";
import { html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../../common/dom/fire_event";
import { stopPropagation } from "../../../../common/dom/stop_propagation";
import { navigate } from "../../../../common/navigate";
import "../../../../components/automation/ha-automation-row";
import "../../../../components/ha-button";
import "../../../../components/ha-card";
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
import { showEnergySettingsDialog } from "../dialogs/show-dialogs-energy";
import type { EnergyEditorConfig } from "../editors/energy-editor";
import type { EnergySidebarConfig } from "../ha-energy-sidebar";
import "./ha-energy-validation-result";
import { scrollSelectedRowIntoView } from "./scroll-selected-row";
import { energyCardStyles } from "./styles";

const isGridSource = (
  source: EnergyPreferences["energy_sources"][number]
): source is GridSourceTypeEnergyPreference => source.type === "grid";

// At least one of import/export/power must exist (enforced by validation)
const primaryStat = (source: GridSourceTypeEnergyPreference) =>
  (source.stat_energy_from || source.stat_energy_to || source.stat_rate)!;

@customElement("ha-energy-grid-settings")
export class EnergyGridSettings extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false })
  public preferences!: EnergyPreferences;

  @property({ attribute: false })
  public statsMetadata?: Record<string, StatisticsMetaData>;

  @property({ attribute: false })
  public validationResult?: EnergyPreferencesValidation;

  /** Edit in the sidebar of the page instead of a dialog */
  @property({ type: Boolean }) public sidebar = false;

  @property({ attribute: false }) public selectedKey?: string;

  @state() private _co2ConfigEntry?: ConfigEntry;

  protected firstUpdated() {
    this._fetchCO2SignalConfigEntries();
  }

  protected updated(changedProps: PropertyValues<this>) {
    super.updated(changedProps);
    if (changedProps.has("selectedKey") && this.selectedKey) {
      scrollSelectedRowIntoView(this.renderRoot);
    }
  }

  protected render(): TemplateResult {
    const gridSources: GridSourceTypeEnergyPreference[] = [];
    const gridValidation: EnergyValidationIssue[][] = [];

    this.preferences.energy_sources.forEach((source, idx) => {
      if (!isGridSource(source)) {
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
          ${
            gridSources.length > 0
              ? html`
                  <div class="items">
                    ${gridSources.map((source) => {
                      const stat = primaryStat(source);
                      const entityState = this.hass.states[stat];
                      return html`
                        <ha-card outlined>
                          <ha-automation-row
                            .selected=${this.selectedKey === `grid:${stat}`}
                            .source=${source}
                            @click=${this._editSource}
                          >
                            ${
                              entityState?.attributes.icon
                                ? html`<ha-icon
                                    slot="leading-icon"
                                    .icon=${entityState.attributes.icon}
                                  ></ha-icon>`
                                : html`<ha-svg-icon
                                    slot="leading-icon"
                                    .path=${mdiTransmissionTower}
                                  ></ha-svg-icon>`
                            }
                            <div slot="header" class="row-header">
                              <span class="label"
                                >${this._sourceName(source)}</span
                              >
                              ${
                                source.stat_energy_from &&
                                source.stat_energy_to &&
                                !source.name
                                  ? html`<span class="label secondary"
                                      >${getStatisticLabel(
                                        this.hass.states,
                                        this.hass.formatEntityName,
                                        source.stat_energy_to,
                                        this.statsMetadata?.[
                                          source.stat_energy_to
                                        ]
                                      )}</span
                                    >`
                                  : nothing
                              }
                            </div>
                            <ha-icon-button
                              slot="icons"
                              .label=${this.hass.localize(
                                "ui.panel.config.energy.grid.delete_connection"
                              )}
                              .path=${mdiDelete}
                              .source=${source}
                              @click=${this._deleteSourceClicked}
                              @keydown=${stopPropagation}
                            ></ha-icon-button>
                          </ha-automation-row>
                        </ha-card>
                      `;
                    })}
                  </div>
                `
              : nothing
          }
          <ha-button @click=${this._addSource} appearance="filled" size="s">
            <ha-svg-icon .path=${mdiPlus} slot="start"></ha-svg-icon>
            ${this.hass.localize("ui.panel.config.energy.grid.add_connection")}
          </ha-button>

          <h3>
            ${this.hass.localize(
              "ui.panel.config.energy.grid.grid_carbon_footprint"
            )}
          </h3>
          ${
            this._co2ConfigEntry
              ? html`
                  <div class="items">
                    <ha-card outlined>
                      <ha-automation-row @click=${this._openCO2Integration}>
                        <img
                          slot="leading-icon"
                          alt=""
                          crossorigin="anonymous"
                          referrerpolicy="no-referrer"
                          src=${brandsUrl(
                            {
                              domain: "co2signal",
                              type: "icon",
                              darkOptimized: this.hass.themes?.darkMode,
                            },
                            this.hass.auth.data.hassUrl
                          )}
                        />
                        <div slot="header" class="row-header">
                          <span class="label"
                            >${this._co2ConfigEntry.title}</span
                          >
                        </div>
                        <ha-icon-button
                          slot="icons"
                          .label=${this.hass.localize(
                            "ui.panel.config.energy.grid.remove_co2_signal"
                          )}
                          .path=${mdiDelete}
                          @click=${this._removeCO2Sensor}
                          @keydown=${stopPropagation}
                        ></ha-icon-button>
                      </ha-automation-row>
                    </ha-card>
                  </div>
                `
              : html`
                  <ha-button
                    @click=${this._addCO2Sensor}
                    appearance="filled"
                    size="s"
                  >
                    <ha-svg-icon .path=${mdiPlus} slot="start"></ha-svg-icon>
                    ${this.hass.localize(
                      "ui.panel.config.energy.grid.add_co2_signal"
                    )}
                  </ha-button>
                `
          }
        </div>
      </ha-card>
    `;
  }

  private _sourceName(source: GridSourceTypeEnergyPreference) {
    const stat = primaryStat(source);
    return (
      source.name ||
      getStatisticLabel(
        this.hass.states,
        this.hass.formatEntityName,
        stat,
        this.statsMetadata?.[stat]
      )
    );
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

  private _openCO2Integration() {
    navigate(
      `/config/integrations/integration/${this._co2ConfigEntry!.domain}`
    );
  }

  private async _removeCO2Sensor(ev: Event) {
    ev.stopPropagation();
    if (
      !(await showConfirmationDialog(this, {
        title: this.hass.localize("ui.panel.config.energy.delete_integration"),
      }))
    ) {
      return;
    }

    await deleteConfigEntry(this.hass, this._co2ConfigEntry!.entry_id);
    this._fetchCO2SignalConfigEntries();
  }

  private _addSource() {
    this._openEditor();
  }

  private _editSource(ev) {
    this._openEditor(ev.currentTarget.source);
  }

  private _openEditor(source?: GridSourceTypeEnergyPreference) {
    const editor = this._editorConfig(this.preferences, source);
    if (this.sidebar) {
      fireEvent(
        this,
        "energy-open-sidebar",
        this._sidebarConfig(editor, source)
      );
    } else {
      showEnergySettingsDialog(this, { editor });
    }
  }

  private _editorConfig(
    preferences: EnergyPreferences,
    source?: GridSourceTypeEnergyPreference
  ): EnergyEditorConfig {
    return {
      kind: "grid",
      params: {
        statsMetadata: this.statsMetadata,
        source: source ? { ...source } : undefined,
        grid_sources: preferences.energy_sources.filter(isGridSource),
        saveCallback: (newSource) => this._saveSource(newSource, source),
      },
    };
  }

  private _sourceIndex(source: GridSourceTypeEnergyPreference) {
    const sources = this.preferences.energy_sources;
    const index = sources.indexOf(source);
    if (index !== -1) {
      return index;
    }
    // Saving anything replaces the preferences while the sidebar stays open
    const stat = primaryStat(source);
    return sources.findIndex(
      (src) => isGridSource(src) && primaryStat(src) === stat
    );
  }

  private _sidebarConfig(
    editor: EnergyEditorConfig,
    source?: GridSourceTypeEnergyPreference
  ): EnergySidebarConfig {
    const subtitle = this.hass.localize("ui.panel.config.energy.grid.title");
    if (!source) {
      return {
        editor,
        title: this.hass.localize("ui.panel.config.energy.grid.add_connection"),
        subtitle,
      };
    }
    return {
      key: `grid:${primaryStat(source)}`,
      editor,
      title: this._sourceName(source),
      subtitle,
      delete: {
        label: this.hass.localize(
          "ui.panel.config.energy.grid.delete_connection"
        ),
        action: () => this._deleteSource(source),
      },
    };
  }

  private async _saveSource(
    source: GridSourceTypeEnergyPreference,
    original?: GridSourceTypeEnergyPreference
  ) {
    const sources = [...this.preferences.energy_sources];
    const index = original ? this._sourceIndex(original) : -1;
    if (index === -1) {
      sources.push(source);
    } else {
      sources[index] = source;
    }
    const result = await this._savePreferences({
      ...this.preferences,
      energy_sources: sources,
    });
    if (this.sidebar) {
      const saved = result.energy_sources[
        index === -1 ? sources.length - 1 : index
      ] as GridSourceTypeEnergyPreference;
      fireEvent(
        this,
        "energy-sidebar-saved",
        this._sidebarConfig(this._editorConfig(result, saved), saved)
      );
    }
  }

  private _deleteSourceClicked(ev) {
    ev.stopPropagation();
    this._deleteSource(ev.currentTarget.source);
  }

  private async _deleteSource(source: GridSourceTypeEnergyPreference) {
    if (
      !(await showConfirmationDialog(this, {
        title: this.hass.localize("ui.panel.config.energy.delete_source"),
      }))
    ) {
      return;
    }

    const index = this._sourceIndex(source);
    if (index === -1) {
      return;
    }
    try {
      await this._savePreferences({
        ...this.preferences,
        energy_sources: this.preferences.energy_sources.filter(
          (_src, idx) => idx !== index
        ),
      });
    } catch (err: any) {
      showAlertDialog(this, {
        title: this.hass.localize("ui.panel.config.energy.save_config_failed", {
          error: err.message,
        }),
      });
      return;
    }
    if (this.selectedKey === `grid:${primaryStat(source)}`) {
      fireEvent(this, "energy-close-sidebar");
    }
  }

  private async _savePreferences(preferences: EnergyPreferences) {
    const result = await saveEnergyPreferences(this.hass, preferences);
    fireEvent(this, "value-changed", { value: result });
    return result;
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
