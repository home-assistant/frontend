import { mdiHomeLightningBolt, mdiDelete, mdiPencil } from "@mdi/js";
import type { CSSResultGroup } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-button";
import "../../../../components/ha-card";
import "../../../../components/ha-icon-button";
import "../../../../components/ha-svg-icon";
import type {
  EnergyInfo,
  EnergyPreferences,
  EnergyPreferencesValidation,
  HomeSourceTypeEnergyPreference,
} from "../../../../data/energy";
import { saveEnergyPreferences } from "../../../../data/energy";
import type { StatisticsMetaData } from "../../../../data/recorder";
import {
  showAlertDialog,
  showConfirmationDialog,
} from "../../../../dialogs/generic/show-dialog-box";
import { haStyle } from "../../../../resources/styles";
import type { HomeAssistant } from "../../../../types";
import { showEnergySettingsHomeDialog } from "../dialogs/show-dialogs-energy";
import "./ha-energy-validation-result";
import { energyCardStyles } from "./styles";

@customElement("ha-energy-home-settings")
export class EnergyHomeSettings extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public preferences!: EnergyPreferences;

  @property({ attribute: false })
  public statsMetadata?: Record<string, StatisticsMetaData>;

  @property({ attribute: false }) public info!: EnergyInfo;

  @property({ attribute: false })
  public validationResult?: EnergyPreferencesValidation;

  protected render() {
    const homeSources: HomeSourceTypeEnergyPreference[] = [];
    const validationIssues: EnergyPreferencesValidation["energy_sources"][number][] =
      [];

    this.preferences.energy_sources.forEach((source, idx) => {
      if (source.type === "home") {
        homeSources.push(source);
        if (this.validationResult?.energy_sources[idx]) {
          validationIssues.push(this.validationResult.energy_sources[idx]);
        }
      }
    });

    return html`
      <ha-card outlined>
        <h1 class="card-header">
          <ha-svg-icon .path=${mdiHomeLightningBolt}></ha-svg-icon>
          ${this.hass.localize("ui.panel.config.energy.home.title")}
        </h1>
        <div class="card-content">
          <p>${this.hass.localize("ui.panel.config.energy.home.sub")}</p>
          ${validationIssues.map(
            (issues) => html`
              <ha-energy-validation-result
                .hass=${this.hass}
                .issues=${issues}
              ></ha-energy-validation-result>
            `
          )}
          ${homeSources.map((source) => {
            const entityState = this.hass.states[source.stat_energy_from];
            return html`
              <div class="row">
                <span class="content">
                  ${
                    source.name ||
                    entityState?.attributes.friendly_name ||
                    source.stat_energy_from
                  }
                </span>
                <ha-icon-button
                  .label=${this.hass.localize(
                    "ui.panel.config.energy.home.edit_home_meter"
                  )}
                  .path=${mdiPencil}
                  .source=${source}
                  @click=${this._editSource}
                ></ha-icon-button>
                <ha-icon-button
                  .label=${this.hass.localize(
                    "ui.panel.config.energy.home.delete_home_meter"
                  )}
                  .path=${mdiDelete}
                  .source=${source}
                  @click=${this._deleteSource}
                ></ha-icon-button>
              </div>
            `;
          })}
          ${
            homeSources.length === 0
              ? html`
                  <div class="row">
                    <ha-button appearance="filled" @click=${this._addSource}>
                      ${this.hass.localize(
                        "ui.panel.config.energy.home.add_home_meter"
                      )}
                    </ha-button>
                  </div>
                `
              : nothing
          }
        </div>
      </ha-card>
    `;
  }

  private _addSource() {
    this._openDialog();
  }

  private _editSource(ev) {
    this._openDialog(ev.currentTarget.source);
  }

  private _openDialog(origSource?: HomeSourceTypeEnergyPreference) {
    showEnergySettingsHomeDialog(this, {
      info: this.info,
      source: origSource,
      statsMetadata: this.statsMetadata,
      energy_sources: this.preferences.energy_sources.filter(
        (s): s is HomeSourceTypeEnergyPreference => s.type === "home"
      ),
      saveCallback: async (newSource) => {
        let sources = this.preferences.energy_sources;
        sources = origSource
          ? sources.map((s) => (s === origSource ? newSource : s))
          : [...sources, newSource];
        await this._save({ ...this.preferences, energy_sources: sources });
      },
    });
  }

  private async _deleteSource(ev) {
    const source = ev.currentTarget.source as HomeSourceTypeEnergyPreference;
    if (
      !(await showConfirmationDialog(this, {
        title: this.hass.localize("ui.panel.config.energy.delete_source"),
      }))
    ) {
      return;
    }
    await this._save({
      ...this.preferences,
      energy_sources: this.preferences.energy_sources.filter(
        (s) => s !== source
      ),
    });
  }

  private async _save(preferences: EnergyPreferences) {
    try {
      const saved = await saveEnergyPreferences(this.hass, preferences);
      fireEvent(this, "value-changed", { value: saved });
    } catch (err: any) {
      showAlertDialog(this, {
        title: `Failed to save config: ${err.message}`,
      });
    }
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      energyCardStyles,
      css`
        .row {
          display: flex;
          align-items: center;
        }
        .content {
          flex-grow: 1;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-energy-home-settings": EnergyHomeSettings;
  }
}
