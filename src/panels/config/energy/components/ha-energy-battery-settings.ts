import { mdiBatteryHigh, mdiDelete, mdiPlus } from "@mdi/js";
import type { CSSResultGroup, TemplateResult } from "lit";
import { html, LitElement, nothing } from "lit";
import memoizeOne from "memoize-one";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../../../../common/dom/fire_event";
import { navigate } from "../../../../common/navigate";
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
import "../ha-energy-editor-page";
import type { EnergyEditorPageConfig } from "../ha-energy-editor-page";
import "./ha-energy-validation-result";
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

  /** Path of the list page, editors open on pages under it instead of dialogs */
  @property({ attribute: false }) public listPath?: string;

  /** Shows the editor page of the item with this key, or `new` to add one */
  @property({ attribute: false }) public editKey?: string;

  @property({ type: Boolean }) public narrow = false;

  protected render(): TemplateResult {
    if (this.listPath && this.editKey !== undefined) {
      return html`<ha-energy-editor-page
        .hass=${this.hass}
        .narrow=${this.narrow}
        .backPath=${this.listPath}
        .config=${this._editorPage(this.editKey)}
      ></ha-energy-editor-page>`;
    }

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
    if (this.listPath) {
      navigate(
        `${this.listPath}/battery/${source ? encodeURIComponent(source.stat_energy_from) : "new"}`
      );
    } else {
      showEnergySettingsDialog(this, {
        editor: this._editorConfig(this.preferences, source),
      });
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
    // Saving replaces the preferences, after which only the statistic matches
    return sources.findIndex(
      (src) =>
        isBatterySource(src) && src.stat_energy_from === source.stat_energy_from
    );
  }

  // Kept per item: a save replaces the preferences right before the page leaves
  private _editorPage = memoizeOne(
    (key: string): EnergyEditorPageConfig | undefined => {
      if (key === "new") {
        return this._pageConfig(this._editorConfig(this.preferences));
      }
      const source = this.preferences.energy_sources.find(
        (src): src is BatterySourceTypeEnergyPreference =>
          isBatterySource(src) && src.stat_energy_from === key
      );
      return (
        source &&
        this._pageConfig(this._editorConfig(this.preferences, source), source)
      );
    }
  );

  private _pageConfig(
    editor: EnergyEditorConfig,
    source?: BatterySourceTypeEnergyPreference
  ): EnergyEditorPageConfig {
    if (!source) {
      return {
        editor,
        title: this.hass.localize(
          "ui.panel.config.energy.battery.add_battery_system"
        ),
      };
    }
    return {
      editor,
      title: this._sourceName(source),
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
    await this._savePreferences({
      ...this.preferences,
      energy_sources: sources,
    });
  }

  private _deleteSourceClicked(ev) {
    ev.stopPropagation();
    this._deleteSource(ev.currentTarget.source);
  }

  private async _deleteSource(
    source: BatterySourceTypeEnergyPreference
  ): Promise<boolean> {
    if (
      !(await showConfirmationDialog(this, {
        title: this.hass.localize("ui.panel.config.energy.delete_source"),
      }))
    ) {
      return false;
    }

    const index = this._sourceIndex(source);
    if (index === -1) {
      return false;
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
      return false;
    }
    return true;
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
