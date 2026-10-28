import { mdiDelete, mdiHome, mdiPlus } from "@mdi/js";
import type { CSSResultGroup, PropertyValues, TemplateResult } from "lit";
import { html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import type { ContextType } from "@lit/context";
import { fireEvent } from "../../../../common/dom/fire_event";
import { stopPropagation } from "../../../../common/dom/stop_propagation";
import "../../../../components/automation/ha-automation-row";
import "../../../../components/ha-card";
import "../../../../components/ha-button";
import "../../../../components/ha-icon-button";
import { consume } from "../../../../common/decorators/consume";
import {
  configContext,
  internationalizationContext,
  statesContext,
} from "../../../../data/context";
import type {
  EnergyPreferences,
  EnergyPreferencesValidation,
  EnergyValidationIssue,
  HomeSourceTypeEnergyPreference,
} from "../../../../data/energy";
import { saveEnergyPreferences } from "../../../../data/energy";
import {
  showConfirmationDialog,
  showAlertDialog,
} from "../../../../dialogs/generic/show-dialog-box";
import { haStyle } from "../../../../resources/styles";
import type { HomeAssistant } from "../../../../types";
import { showEnergySettingsDialog } from "../dialogs/show-dialogs-energy";
import type { EnergyEditorConfig } from "../editors/energy-editor";
import type { EnergySidebarConfig } from "../ha-energy-sidebar";
import "./ha-energy-validation-result";
import { scrollSelectedRowIntoView } from "./scroll-selected-row";
import { energyCardStyles } from "./styles";

const isHomeSource = (
  source: EnergyPreferences["energy_sources"][number]
): source is HomeSourceTypeEnergyPreference => source.type === "home";

@customElement("ha-energy-home-settings")
export class EnergyHomeSettings extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state()
  @consume({ context: internationalizationContext, subscribe: true })
  private _i18n!: ContextType<typeof internationalizationContext>;

  @state()
  @consume({ context: statesContext, subscribe: true })
  private _states!: ContextType<typeof statesContext>;

  @state()
  @consume({ context: configContext, subscribe: true })
  private _hassConfig!: ContextType<typeof configContext>;

  @property({ attribute: false })
  public preferences!: EnergyPreferences;

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
    const homeSources: HomeSourceTypeEnergyPreference[] = [];
    const homeValidation: EnergyValidationIssue[][] = [];

    this.preferences.energy_sources.forEach((source, idx) => {
      if (!isHomeSource(source)) {
        return;
      }
      homeSources.push(source);

      if (this.validationResult) {
        homeValidation.push(this.validationResult.energy_sources[idx]);
      }
    });

    return html`
      <ha-card>
        <h1 class="card-header">
          <ha-svg-icon .path=${mdiHome}></ha-svg-icon>
          ${this._i18n.localize("ui.panel.config.energy.home.title")}
        </h1>

        <div class="card-content">
          <p>${this._i18n.localize("ui.panel.config.energy.home.sub")}</p>
          ${homeValidation.map(
            (result) => html`
              <ha-energy-validation-result
                .hass=${this.hass}
                .issues=${result}
              ></ha-energy-validation-result>
            `
          )}
          ${
            homeSources.length > 0
              ? html`
                  <div class="items">
                    ${homeSources.map((source) => {
                      const entityState = this._states[source.stat_energy_to];
                      return html`
                        <ha-card outlined>
                          <ha-automation-row
                            .selected=${
                              this.selectedKey ===
                              `home:${source.stat_energy_to}`
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
                                    .path=${mdiHome}
                                  ></ha-svg-icon>`
                            }
                            <div slot="header" class="row-header">
                              <span class="label"
                                >${this._sourceName(source)}</span
                              >
                            </div>
                            <ha-icon-button
                              slot="icons"
                              .label=${this._i18n.localize(
                                "ui.panel.config.energy.home.remove_home_meter"
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
          ${
            homeSources.length === 0
              ? html`
                  <ha-button
                    @click=${this._addSource}
                    appearance="filled"
                    size="s"
                  >
                    <ha-svg-icon slot="start" .path=${mdiPlus}></ha-svg-icon>
                    ${this._i18n.localize(
                      "ui.panel.config.energy.home.add_home_meter"
                    )}
                  </ha-button>
                `
              : nothing
          }
        </div>
      </ha-card>
    `;
  }

  private _sourceName(source: HomeSourceTypeEnergyPreference) {
    return source.name || this._hassConfig.config.location_name;
  }

  private _addSource() {
    this._openEditor();
  }

  private _editSource(ev) {
    this._openEditor(ev.currentTarget.source);
  }

  private _openEditor(source?: HomeSourceTypeEnergyPreference) {
    const editor = this._editorConfig(source);
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
    source?: HomeSourceTypeEnergyPreference
  ): EnergyEditorConfig {
    return {
      kind: "home",
      params: {
        source: source ? { ...source } : undefined,
        saveCallback: (newSource) => this._saveSource(newSource, source),
      },
    };
  }

  private _sourceIndex(source: HomeSourceTypeEnergyPreference) {
    const sources = this.preferences.energy_sources;
    const index = sources.indexOf(source);
    if (index !== -1) {
      return index;
    }
    // Saving anything replaces the preferences while the sidebar stays open
    return sources.findIndex(
      (src) => isHomeSource(src) && src.stat_energy_to === source.stat_energy_to
    );
  }

  private _sidebarConfig(
    editor: EnergyEditorConfig,
    source?: HomeSourceTypeEnergyPreference
  ): EnergySidebarConfig {
    const subtitle = this._i18n.localize("ui.panel.config.energy.home.title");
    if (!source) {
      return {
        editor,
        title: this._i18n.localize(
          "ui.panel.config.energy.home.add_home_meter"
        ),
        subtitle,
      };
    }
    return {
      key: `home:${source.stat_energy_to}`,
      editor,
      title: this._sourceName(source),
      subtitle,
      delete: {
        label: this._i18n.localize(
          "ui.panel.config.energy.home.remove_home_meter"
        ),
        action: () => this._deleteSource(source),
      },
    };
  }

  private async _saveSource(
    source: HomeSourceTypeEnergyPreference,
    original?: HomeSourceTypeEnergyPreference
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
      ] as HomeSourceTypeEnergyPreference;
      fireEvent(
        this,
        "energy-sidebar-saved",
        this._sidebarConfig(this._editorConfig(saved), saved)
      );
    }
  }

  private _deleteSourceClicked(ev) {
    ev.stopPropagation();
    this._deleteSource(ev.currentTarget.source);
  }

  private async _deleteSource(source: HomeSourceTypeEnergyPreference) {
    if (
      !(await showConfirmationDialog(this, {
        title: this._i18n.localize("ui.panel.config.energy.delete_source"),
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
        title: this._i18n.localize(
          "ui.panel.config.energy.save_config_failed",
          { error: err.message }
        ),
      });
      return;
    }
    if (this.selectedKey === `home:${source.stat_energy_to}`) {
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
    "ha-energy-home-settings": EnergyHomeSettings;
  }
}
