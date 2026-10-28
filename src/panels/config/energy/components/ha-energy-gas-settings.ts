import { mdiDelete, mdiFire, mdiPlus } from "@mdi/js";
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
  GasSourceTypeEnergyPreference,
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
import { showEnergySettingsDialog } from "../dialogs/show-dialogs-energy";
import type { EnergyEditorConfig } from "../editors/energy-editor";
import type { EnergySidebarConfig } from "../ha-energy-sidebar";
import "./ha-energy-validation-result";
import { scrollSelectedRowIntoView } from "./scroll-selected-row";
import { energyCardStyles } from "./styles";

const isGasSource = (
  source: EnergyPreferences["energy_sources"][number]
): source is GasSourceTypeEnergyPreference => source.type === "gas";

@customElement("ha-energy-gas-settings")
export class EnergyGasSettings extends LitElement {
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
    const gasSources: GasSourceTypeEnergyPreference[] = [];
    const gasValidation: EnergyValidationIssue[][] = [];

    this.preferences.energy_sources.forEach((source, idx) => {
      if (!isGasSource(source)) {
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
          ${
            gasSources.length > 0
              ? html`
                  <div class="items">
                    ${gasSources.map((source) => {
                      const entityState =
                        this.hass.states[source.stat_energy_from];
                      return html`
                        <ha-card outlined>
                          <ha-automation-row
                            .selected=${
                              this.selectedKey ===
                              `gas:${source.stat_energy_from}`
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
                                    .path=${mdiFire}
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
                                "ui.panel.config.energy.gas.delete_gas_source"
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
            ${this.hass.localize("ui.panel.config.energy.gas.add_gas_source")}
          </ha-button>
        </div>
      </ha-card>
    `;
  }

  private _sourceName(source: GasSourceTypeEnergyPreference) {
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

  private _openEditor(source?: GasSourceTypeEnergyPreference) {
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
    source?: GasSourceTypeEnergyPreference
  ): EnergyEditorConfig {
    return {
      kind: "gas",
      params: {
        source: source ? { ...source } : undefined,
        statsMetadata: this.statsMetadata,
        allowedGasUnitClass: getEnergyGasUnitClass(
          preferences,
          source?.stat_energy_from,
          this.statsMetadata
        ),
        gas_sources: preferences.energy_sources.filter(isGasSource),
        saveCallback: (newSource) => this._saveSource(newSource, source),
      },
    };
  }

  private _sourceIndex(source: GasSourceTypeEnergyPreference) {
    const sources = this.preferences.energy_sources;
    const index = sources.indexOf(source);
    if (index !== -1) {
      return index;
    }
    // Saving anything replaces the preferences while the sidebar stays open
    return sources.findIndex(
      (src) =>
        isGasSource(src) && src.stat_energy_from === source.stat_energy_from
    );
  }

  private _sidebarConfig(
    editor: EnergyEditorConfig,
    source?: GasSourceTypeEnergyPreference
  ): EnergySidebarConfig {
    const subtitle = this.hass.localize("ui.panel.config.energy.gas.title");
    if (!source) {
      return {
        editor,
        title: this.hass.localize("ui.panel.config.energy.gas.add_gas_source"),
        subtitle,
      };
    }
    return {
      key: `gas:${source.stat_energy_from}`,
      editor,
      title: this._sourceName(source),
      subtitle,
      delete: {
        label: this.hass.localize(
          "ui.panel.config.energy.gas.delete_gas_source"
        ),
        action: () => this._deleteSource(source),
      },
    };
  }

  private async _saveSource(
    source: GasSourceTypeEnergyPreference,
    original?: GasSourceTypeEnergyPreference
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
      ] as GasSourceTypeEnergyPreference;
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

  private async _deleteSource(source: GasSourceTypeEnergyPreference) {
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
    if (this.selectedKey === `gas:${source.stat_energy_from}`) {
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
    "ha-energy-gas-settings": EnergyGasSettings;
  }
}
