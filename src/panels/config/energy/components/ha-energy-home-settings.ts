import { mdiDelete, mdiHome, mdiPencil, mdiPlus } from "@mdi/js";
import type { CSSResultGroup, TemplateResult } from "lit";
import { html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import type { ContextType } from "@lit/context";
import { fireEvent } from "../../../../common/dom/fire_event";
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
import { showEnergySettingsHomeDialog } from "../dialogs/show-dialogs-energy";
import "./ha-energy-validation-result";
import { energyCardStyles } from "./styles";

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

  protected render(): TemplateResult {
    const homeSources: HomeSourceTypeEnergyPreference[] = [];
    const homeValidation: EnergyValidationIssue[][] = [];

    this.preferences.energy_sources.forEach((source, idx) => {
      if (source.type !== "home") {
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
                  <div class="items-container">
                    ${homeSources.map((source) => {
                      const entityState = this._states[source.stat_energy_to];
                      return html`
                        <div class="row" .source=${source}>
                          ${
                            entityState?.attributes.icon
                              ? html`<ha-icon
                                  .icon=${entityState.attributes.icon}
                                ></ha-icon>`
                              : html`<ha-svg-icon
                                  .path=${mdiHome}
                                ></ha-svg-icon>`
                          }
                          <span class="content"
                            >${
                              source.name ||
                              this._hassConfig.config.location_name
                            }</span
                          >
                          <ha-icon-button
                            .label=${this._i18n.localize(
                              "ui.panel.config.energy.home.edit_home_meter"
                            )}
                            @click=${this._editSource}
                            .path=${mdiPencil}
                          ></ha-icon-button>
                          <ha-icon-button
                            .label=${this._i18n.localize(
                              "ui.panel.config.energy.home.remove_home_meter"
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
            homeSources.length === 0
              ? html`
                  <div class="row">
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
                  </div>
                `
              : ""
          }
        </div>
      </ha-card>
    `;
  }

  private _addSource() {
    showEnergySettingsHomeDialog(this, {
      hass: this.hass,
      saveCallback: async (source) => {
        await this._savePreferences({
          ...this.preferences,
          energy_sources: this.preferences.energy_sources.concat(source),
        });
      },
    });
  }

  private _editSource(ev) {
    const origSource: HomeSourceTypeEnergyPreference =
      ev.currentTarget.closest(".row").source;
    showEnergySettingsHomeDialog(this, {
      hass: this.hass,
      source: { ...origSource },
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
    const sourceToDelete: HomeSourceTypeEnergyPreference =
      ev.currentTarget.closest(".row").source;

    if (
      !(await showConfirmationDialog(this, {
        title: this._i18n.localize("ui.panel.config.energy.delete_source"),
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
      showAlertDialog(this, {
        title: this._i18n.localize(
          "ui.panel.config.energy.save_config_failed",
          { error: err.message }
        ),
      });
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
    "ha-energy-home-settings": EnergyHomeSettings;
  }
}
