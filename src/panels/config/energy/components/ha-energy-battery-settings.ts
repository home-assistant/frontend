import { mdiBatteryHigh, mdiDelete, mdiPlus } from "@mdi/js";
import type { CSSResultGroup, PropertyValues, TemplateResult } from "lit";
import { html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../../../../common/dom/fire_event";
import { stopPropagation } from "../../../../common/dom/stop_propagation";
import "../../../../components/automation/ha-automation-row";
import "../../../../components/ha-card";
import "../../../../components/ha-button";
import "../../../../components/ha-svg-icon";
import "../../../../components/ha-icon-button";
import type {
  BatterySourceTypeEnergyPreference,
  EnergyPreferences,
  EnergyPreferencesValidation,
  EnergyValidationIssue,
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

const isBatterySource = (
  source: EnergyPreferences["energy_sources"][number]
): source is BatterySourceTypeEnergyPreference => source.type === "battery";

@customElement("ha-energy-battery-settings")
export class EnergyBatterySettings extends LitElement {
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
    const batterySources: BatterySourceTypeEnergyPreference[] = [];
    const batteryValidation: EnergyValidationIssue[][] = [];

    this.preferences.energy_sources.forEach((source, idx) => {
      if (!isBatterySource(source)) {
        return;
      }
      batterySources.push(source);

      if (this.validationResult) {
        batteryValidation.push(this.validationResult.energy_sources[idx]);
      }
    });

    return html`
      <ha-card>
        <h1 class="card-header">
          <ha-svg-icon .path=${mdiBatteryHigh}></ha-svg-icon>
          ${this.hass.localize("ui.panel.config.energy.battery.title")}
        </h1>

        <div class="card-content">
          <p>
            ${this.hass.localize("ui.panel.config.energy.battery.sub")}
            <a
              target="_blank"
              rel="noopener noreferrer"
              href=${documentationUrl(this.hass, "/docs/energy/battery/")}
              >${this.hass.localize(
                "ui.panel.config.energy.battery.learn_more"
              )}</a
            >
          </p>
          ${batteryValidation.map(
            (result) => html`
              <ha-energy-validation-result
                .hass=${this.hass}
                .issues=${result}
              ></ha-energy-validation-result>
            `
          )}
          ${
            batterySources.length > 0
              ? html`
                  <div class="items">
                    ${batterySources.map((source) => {
                      const toEntityState =
                        this.hass.states[source.stat_energy_to];
                      return html`
                        <ha-card outlined>
                          <ha-automation-row
                            .selected=${
                              this.selectedKey ===
                              `battery:${source.stat_energy_from}`
                            }
                            .source=${source}
                            @click=${this._editSource}
                          >
                            ${
                              toEntityState?.attributes.icon
                                ? html`<ha-icon
                                    slot="leading-icon"
                                    .icon=${toEntityState.attributes.icon}
                                  ></ha-icon>`
                                : html`<ha-svg-icon
                                    slot="leading-icon"
                                    .path=${mdiBatteryHigh}
                                  ></ha-svg-icon>`
                            }
                            <div slot="header" class="row-header">
                              <span class="label"
                                >${this._sourceName(source)}</span
                              >
                              ${
                                source.name
                                  ? nothing
                                  : html`<span class="label secondary"
                                      >${getStatisticLabel(
                                        this.hass.states,
                                        this.hass.formatEntityName,
                                        source.stat_energy_to,
                                        this.statsMetadata?.[
                                          source.stat_energy_to
                                        ]
                                      )}</span
                                    >`
                              }
                            </div>
                            <ha-icon-button
                              slot="icons"
                              .label=${this.hass.localize(
                                "ui.panel.config.energy.battery.delete_battery_system"
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
              "ui.panel.config.energy.battery.add_battery_system"
            )}
          </ha-button>
        </div>
      </ha-card>
    `;
  }

  private _sourceName(source: BatterySourceTypeEnergyPreference) {
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

  private _openEditor(source?: BatterySourceTypeEnergyPreference) {
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
    source?: BatterySourceTypeEnergyPreference
  ): EnergyEditorConfig {
    return {
      kind: "battery",
      params: {
        statsMetadata: this.statsMetadata,
        source: source ? { ...source } : undefined,
        battery_sources: preferences.energy_sources.filter(isBatterySource),
        saveCallback: (newSource) => this._saveSource(newSource, source),
      },
    };
  }

  private _sourceIndex(source: BatterySourceTypeEnergyPreference) {
    const sources = this.preferences.energy_sources;
    const index = sources.indexOf(source);
    if (index !== -1) {
      return index;
    }
    // Saving anything replaces the preferences while the sidebar stays open
    return sources.findIndex(
      (src) =>
        isBatterySource(src) && src.stat_energy_from === source.stat_energy_from
    );
  }

  private _sidebarConfig(
    editor: EnergyEditorConfig,
    source?: BatterySourceTypeEnergyPreference
  ): EnergySidebarConfig {
    const subtitle = this.hass.localize("ui.panel.config.energy.battery.title");
    if (!source) {
      return {
        editor,
        title: this.hass.localize(
          "ui.panel.config.energy.battery.add_battery_system"
        ),
        subtitle,
      };
    }
    return {
      key: `battery:${source.stat_energy_from}`,
      editor,
      title: this._sourceName(source),
      subtitle,
      delete: {
        label: this.hass.localize(
          "ui.panel.config.energy.battery.delete_battery_system"
        ),
        action: () => this._deleteSource(source),
      },
    };
  }

  private async _saveSource(
    source: BatterySourceTypeEnergyPreference,
    original?: BatterySourceTypeEnergyPreference
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
      ] as BatterySourceTypeEnergyPreference;
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

  private async _deleteSource(source: BatterySourceTypeEnergyPreference) {
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
    if (this.selectedKey === `battery:${source.stat_energy_from}`) {
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
    "ha-energy-battery-settings": EnergyBatterySettings;
  }
}
