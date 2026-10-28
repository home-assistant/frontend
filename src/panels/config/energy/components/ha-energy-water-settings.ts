import { mdiDelete, mdiPlus, mdiWater } from "@mdi/js";
import type { CSSResultGroup, PropertyValues, TemplateResult } from "lit";
import { html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../../../../common/dom/fire_event";
import { stopPropagation } from "../../../../common/dom/stop_propagation";
import "../../../../components/automation/ha-automation-row";
import "../../../../components/ha-button";
import "../../../../components/ha-card";
import "../../../../components/ha-icon-button";
import "../../../../components/ha-svg-icon";
import type {
  EnergyPreferences,
  EnergyPreferencesValidation,
  EnergyValidationIssue,
  WaterSourceTypeEnergyPreference,
} from "../../../../data/energy";
import { saveEnergyPreferences } from "../../../../data/energy";
import type { StatisticsMetaData } from "../../../../data/recorder";
import { getStatisticLabel } from "../../../../data/recorder";
import {
  showAlertDialog,
  showConfirmationDialog,
} from "../../../../dialogs/generic/show-dialog-box";
import { haStyle } from "../../../../resources/styles";
import type { HomeAssistant } from "../../../../types";
import { documentationUrl } from "../../../../util/documentation-url";
import { showEnergySettingsDialog } from "../dialogs/show-dialogs-energy";
import type { EnergyEditorConfig } from "../editors/energy-editor";
import type { EnergySidebarConfig } from "../ha-energy-sidebar";
import "./ha-energy-validation-result";
import { scrollSelectedRowIntoView } from "./scroll-selected-row";
import { energyCardStyles } from "./styles";

const isWaterSource = (
  source: EnergyPreferences["energy_sources"][number]
): source is WaterSourceTypeEnergyPreference => source.type === "water";

@customElement("ha-energy-water-settings")
export class EnergyWaterSettings extends LitElement {
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

  protected updated(changedProps: PropertyValues<this>) {
    super.updated(changedProps);
    if (changedProps.has("selectedKey") && this.selectedKey) {
      scrollSelectedRowIntoView(this.renderRoot);
    }
  }

  protected render(): TemplateResult {
    const waterSources: WaterSourceTypeEnergyPreference[] = [];
    const waterValidation: EnergyValidationIssue[][] = [];

    this.preferences.energy_sources.forEach((source, idx) => {
      if (!isWaterSource(source)) {
        return;
      }
      waterSources.push(source);

      if (this.validationResult) {
        waterValidation.push(this.validationResult.energy_sources[idx]);
      }
    });

    return html`
      <ha-card>
        <h1 class="card-header">
          <ha-svg-icon .path=${mdiWater}></ha-svg-icon>
          ${this.hass.localize("ui.panel.config.energy.water.title")}
        </h1>

        <div class="card-content">
          <p>
            ${this.hass.localize("ui.panel.config.energy.water.sub")}
            <a
              target="_blank"
              rel="noopener noreferrer"
              href=${documentationUrl(this.hass, "/docs/energy/water/")}
              >${this.hass.localize(
                "ui.panel.config.energy.water.learn_more"
              )}</a
            >
          </p>
          ${waterValidation.map(
            (result) => html`
              <ha-energy-validation-result
                .hass=${this.hass}
                .issues=${result}
              ></ha-energy-validation-result>
            `
          )}
          ${
            waterSources.length > 0
              ? html`
                  <div class="items">
                    ${waterSources.map((source) => {
                      const entityState =
                        this.hass.states[source.stat_energy_from];
                      return html`
                        <ha-card outlined>
                          <ha-automation-row
                            .selected=${
                              this.selectedKey ===
                              `water:${source.stat_energy_from}`
                            }
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
                                    .path=${mdiWater}
                                  ></ha-svg-icon>`
                            }
                            <div slot="header" class="row-header">
                              <span class="label"
                                >${this._sourceName(source)}</span
                              >
                            </div>
                            <ha-icon-button
                              slot="icons"
                              .label=${this.hass.localize(
                                "ui.panel.config.energy.water.delete_water_source"
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
            <ha-svg-icon slot="start" .path=${mdiPlus}></ha-svg-icon>
            ${this.hass.localize(
              "ui.panel.config.energy.water.add_water_source"
            )}
          </ha-button>
        </div>
      </ha-card>
    `;
  }

  private _sourceName(source: WaterSourceTypeEnergyPreference) {
    return (
      source.name ||
      getStatisticLabel(
        this.hass.states,
        this.hass.formatEntityName,
        source.stat_energy_from,
        this.statsMetadata?.[source.stat_energy_from]
      )
    );
  }

  private _addSource() {
    this._openEditor();
  }

  private _editSource(ev) {
    this._openEditor(ev.currentTarget.source);
  }

  private _openEditor(source?: WaterSourceTypeEnergyPreference) {
    const editor = this._editorConfig(this.preferences, source);
    if (this.sidebar) {
      fireEvent(
        this,
        "energy-open-sidebar",
        this._sidebarConfig(editor, source)
      );
    } else {
      showEnergySettingsDialog(this, { hass: this.hass, editor });
    }
  }

  private _editorConfig(
    preferences: EnergyPreferences,
    source?: WaterSourceTypeEnergyPreference
  ): EnergyEditorConfig {
    return {
      kind: "water",
      params: {
        source: source ? { ...source } : undefined,
        statsMetadata: this.statsMetadata,
        water_sources: preferences.energy_sources.filter(isWaterSource),
        saveCallback: (newSource) => this._saveSource(newSource, source),
      },
    };
  }

  private _sourceIndex(source: WaterSourceTypeEnergyPreference) {
    const sources = this.preferences.energy_sources;
    const index = sources.indexOf(source);
    if (index !== -1) {
      return index;
    }
    // Saving anything replaces the preferences while the sidebar stays open
    return sources.findIndex(
      (src) =>
        isWaterSource(src) && src.stat_energy_from === source.stat_energy_from
    );
  }

  private _sidebarConfig(
    editor: EnergyEditorConfig,
    source?: WaterSourceTypeEnergyPreference
  ): EnergySidebarConfig {
    const subtitle = this.hass.localize("ui.panel.config.energy.water.title");
    if (!source) {
      return {
        editor,
        title: this.hass.localize(
          "ui.panel.config.energy.water.add_water_source"
        ),
        subtitle,
      };
    }
    return {
      key: `water:${source.stat_energy_from}`,
      editor,
      title: this._sourceName(source),
      subtitle,
      delete: {
        label: this.hass.localize(
          "ui.panel.config.energy.water.delete_water_source"
        ),
        action: () => this._deleteSource(source),
      },
    };
  }

  private async _saveSource(
    source: WaterSourceTypeEnergyPreference,
    original?: WaterSourceTypeEnergyPreference
  ) {
    const sources = [...this.preferences.energy_sources];
    const index = original ? this._sourceIndex(original) : -1;
    if (index === -1) {
      delete source.unit_of_measurement;
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
      ] as WaterSourceTypeEnergyPreference;
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

  private async _deleteSource(source: WaterSourceTypeEnergyPreference) {
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
    if (this.selectedKey === `water:${source.stat_energy_from}`) {
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
    "ha-energy-water-settings": EnergyWaterSettings;
  }
}
