import { mdiDelete, mdiRadiator, mdiPlus } from "@mdi/js";
import type { CSSResultGroup, TemplateResult } from "lit";
import { html, LitElement, nothing } from "lit";
import { ifDefined } from "lit/directives/if-defined";
import memoizeOne from "memoize-one";
import { customElement, property } from "lit/decorators";
import type { HASSDomCurrentTargetEvent } from "../../../../common/dom/fire_event";
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
  HeatSourceTypeEnergyPreference,
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

const isHeatSource = (
  source: EnergyPreferences["energy_sources"][number]
): source is HeatSourceTypeEnergyPreference => source.type === "heat";

@customElement("ha-energy-heat-settings")
export class EnergyHeatSettings extends LitElement {
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

    const heatSources: HeatSourceTypeEnergyPreference[] = [];
    const heatValidation: EnergyValidationIssue[][] = [];

    this.preferences.energy_sources.forEach((source, idx) => {
      if (!isHeatSource(source)) {
        return;
      }
      heatSources.push(source);

      if (this.validationResult) {
        heatValidation.push(this.validationResult.energy_sources[idx]);
      }
    });

    return html`
      <ha-card>
        <h1 class="card-header">
          <ha-svg-icon .path=${mdiRadiator}></ha-svg-icon>
          ${this.hass.localize("ui.panel.config.energy.heat.title")}
        </h1>

        <div class="card-content">
          <p>
            ${this.hass.localize("ui.panel.config.energy.heat.sub")}
            <a
              target="_blank"
              rel="noopener noreferrer"
              href=${documentationUrl(this.hass, "/docs/energy/")}
              >${this.hass.localize("ui.panel.config.energy.heat.learn_more")}</a
            >
          </p>
          ${heatValidation.map(
            (result) => html`
              <ha-energy-validation-result
                .hass=${this.hass}
                .issues=${result}
              ></ha-energy-validation-result>
            `
          )}
          ${
            heatSources.length > 0
              ? html`
                  <div class="items">
                    ${heatSources.map((source) => {
                      const entityState =
                        this.hass.states[source.stat_energy_from];
                      return html`
                        <ha-card outlined>
                          <ha-automation-row
                            .href=${this._editorHref(source)}
                            @click=${this.listPath ? nothing : this._editSource}
                            data-source=${source.stat_energy_from}
                          >
                            ${
                              entityState?.attributes.icon
                                ? html`<ha-icon
                                    slot="leading-icon"
                                    .icon=${entityState.attributes.icon}
                                  ></ha-icon>`
                                : html`<ha-svg-icon
                                    slot="leading-icon"
                                    .path=${mdiRadiator}
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
                                "ui.panel.config.energy.heat.delete_heat_source"
                              )}
                              .path=${mdiDelete}
                              @click=${this._deleteSourceClicked}
                              data-source=${source.stat_energy_from}
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
          <ha-button
            href=${ifDefined(this._editorHref())}
            @click=${this.listPath ? nothing : this._addSource}
            appearance="filled"
            size="s"
          >
            <ha-svg-icon slot="start" .path=${mdiPlus}></ha-svg-icon>
            ${this.hass.localize("ui.panel.config.energy.heat.add_heat_source")}
          </ha-button>
        </div>
      </ha-card>
    `;
  }

  private _sourceName(source: HeatSourceTypeEnergyPreference) {
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

  private _openEditor(source?: HeatSourceTypeEnergyPreference) {
    showEnergySettingsDialog(this, {
      editor: this._editorConfig(this.preferences, source),
    });
  }

  private _editorHref(source?: HeatSourceTypeEnergyPreference) {
    return this.listPath
      ? `${this.listPath}/heat/${source ? encodeURIComponent(source.stat_energy_from) : "new"}`
      : undefined;
  }

  private _editorConfig(
    preferences: EnergyPreferences,
    source?: HeatSourceTypeEnergyPreference
  ): EnergyEditorConfig {
    return {
      kind: "heat",
      params: {
        source: source ? { ...source } : undefined,
        statsMetadata: this.statsMetadata,
        heat_sources: preferences.energy_sources.filter(isHeatSource),
        saveCallback: (newSource) => this._saveSource(newSource, source),
      },
    };
  }

  private _sourceIndex(source: HeatSourceTypeEnergyPreference) {
    const sources = this.preferences.energy_sources;
    const index = sources.indexOf(source);
    if (index !== -1) {
      return index;
    }
    // Saving replaces the preferences, after which only the statistic matches
    return sources.findIndex(
      (src) =>
        isHeatSource(src) && src.stat_energy_from === source.stat_energy_from
    );
  }

  // Kept per item: a save replaces the preferences right before the page leaves
  private _editorPage = memoizeOne(
    (key: string): EnergyEditorPageConfig | undefined => {
      if (key === "new") {
        return this._pageConfig(this._editorConfig(this.preferences));
      }
      const source = this.preferences.energy_sources.find(
        (src): src is HeatSourceTypeEnergyPreference =>
          isHeatSource(src) && src.stat_energy_from === key
      );
      return (
        source &&
        this._pageConfig(this._editorConfig(this.preferences, source), source)
      );
    }
  );

  private _pageConfig(
    editor: EnergyEditorConfig,
    source?: HeatSourceTypeEnergyPreference
  ): EnergyEditorPageConfig {
    if (!source) {
      return {
        editor,
        title: this.hass.localize(
          "ui.panel.config.energy.heat.add_heat_source"
        ),
      };
    }
    return {
      editor,
      title: this._sourceName(source),
      delete: {
        label: this.hass.localize(
          "ui.panel.config.energy.heat.delete_heat_source"
        ),
        action: () => this._deleteSource(source),
      },
    };
  }

  private async _saveSource(
    source: HeatSourceTypeEnergyPreference,
    original?: HeatSourceTypeEnergyPreference
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

  private _sourceFromEvent(ev: HASSDomCurrentTargetEvent<HTMLElement>) {
    return this.preferences.energy_sources.find(
      (source): source is HeatSourceTypeEnergyPreference =>
        isHeatSource(source) &&
        source.stat_energy_from === ev.currentTarget.dataset.source
    );
  }

  private _editSource(ev: HASSDomCurrentTargetEvent<HTMLElement>) {
    const source = this._sourceFromEvent(ev);
    if (source) this._openEditor(source);
  }

  private _deleteSourceClicked(ev: HASSDomCurrentTargetEvent<HTMLElement>) {
    ev.stopPropagation();
    const source = this._sourceFromEvent(ev);
    if (source) this._deleteSource(source);
  }

  private async _deleteSource(
    source: HeatSourceTypeEnergyPreference
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
    } catch (err: unknown) {
      showAlertDialog(this, {
        title: this.hass.localize("ui.panel.config.energy.save_config_failed", {
          error: err instanceof Error ? err.message : String(err),
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
    "ha-energy-heat-settings": EnergyHeatSettings;
  }
}
