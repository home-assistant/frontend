import "@material/mwc-button/mwc-button";
import { mdiBatteryHigh, mdiDelete, mdiPencil } from "@mdi/js";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-card";
import "../../../../components/ha-icon-button";
import "../../../../components/ha-settings-row";
import {
  BatterySourceTypeEnergyPreference,
  EnergyPreferences,
  EnergyPreferencesValidation,
  EnergyValidationIssue,
  saveEnergyPreferences,
} from "../../../../data/energy";
import {
  StatisticsMetaData,
  getStatisticLabel,
} from "../../../../data/recorder";
import {
  showAlertDialog,
  showConfirmationDialog,
} from "../../../../dialogs/generic/show-dialog-box";
import { haStyle } from "../../../../resources/styles";
import { HomeAssistant } from "../../../../types";
import { documentationUrl } from "../../../../util/documentation-url";
import { showEnergySettingsBatteryDialog } from "../dialogs/show-dialogs-energy";
import "./ha-energy-validation-result";
import { energyCardStyles } from "./styles";

@customElement("ha-energy-battery-settings")
export class EnergyBatterySettings extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false })
  public preferences!: EnergyPreferences;

  @property({ attribute: false })
  public statsMetadata?: Record<string, StatisticsMetaData>;

  @property({ attribute: false })
  public validationResult?: EnergyPreferencesValidation;

  protected render(): TemplateResult {
    const batterySources: BatterySourceTypeEnergyPreference[] = [];
    const batteryValidation: EnergyValidationIssue[][] = [];

    this.preferences.energy_sources.forEach((source, idx) => {
      if (source.type !== "battery") {
        return;
      }
      batterySources.push(source);

      if (this.validationResult) {
        batteryValidation.push(this.validationResult.energy_sources[idx]);
      }
    });

    return html`
      <ha-card outlined>
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

          <h3>
            ${this.hass.localize(
              "ui.panel.config.energy.battery.battery_systems"
            )}
          </h3>
          ${batterySources.map((source) => {
            const toEntityState = this.hass.states[source.stat_energy_to];
            return html`
              <div class="row" .source=${source}>
                ${toEntityState?.attributes.icon
                  ? html`<ha-icon
                      .icon=${toEntityState.attributes.icon}
                    ></ha-icon>`
                  : html`<ha-svg-icon .path=${mdiBatteryHigh}></ha-svg-icon>`}
                <div class="content">
                  <span class="label"
                    >${getStatisticLabel(
                      this.hass,
                      source.stat_energy_from,
                      this.statsMetadata?.[source.stat_energy_from]
                    )}</span
                  >
                  <span class="label"
                    >${getStatisticLabel(
                      this.hass,
                      source.stat_energy_to,
                      this.statsMetadata?.[source.stat_energy_to]
                    )}</span
                  >
                </div>
                <ha-icon-button
                  .label=${this.hass.localize(
                    "ui.panel.config.energy.battery.edit_battery_system"
                  )}
                  @click=${this._editSource}
                  .path=${mdiPencil}
                ></ha-icon-button>
                <ha-icon-button
                  .label=${this.hass.localize(
                    "ui.panel.config.energy.battery.delete_battery_system"
                  )}
                  @click=${this._deleteSource}
                  .path=${mdiDelete}
                ></ha-icon-button>
              </div>
            `;
          })}
          <div class="row border-bottom">
            <ha-svg-icon .path=${mdiBatteryHigh}></ha-svg-icon>
            <mwc-button @click=${this._addSource}
              >${this.hass.localize(
                "ui.panel.config.energy.battery.add_battery_system"
              )}</mwc-button
            >
          </div>
        </div>
      </ha-card>
    `;
  }

  private _addSource() {
    showEnergySettingsBatteryDialog(this, {
      battery_sources: this.preferences.energy_sources.filter(
        (src) => src.type === "battery"
      ) as BatterySourceTypeEnergyPreference[],
      saveCallback: async (source) => {
        await this._savePreferences({
          ...this.preferences,
          energy_sources: this.preferences.energy_sources.concat(source),
        });
      },
    });
  }

  private _editSource(ev) {
    const origSource: BatterySourceTypeEnergyPreference =
      ev.currentTarget.closest(".row").source;
    showEnergySettingsBatteryDialog(this, {
      source: { ...origSource },
      battery_sources: this.preferences.energy_sources.filter(
        (src) => src.type === "battery"
      ) as BatterySourceTypeEnergyPreference[],
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
    const sourceToDelete: BatterySourceTypeEnergyPreference =
      ev.currentTarget.closest(".row").source;

    if (
      !(await showConfirmationDialog(this, {
        title: this.hass.localize("ui.panel.config.energy.delete_source"),
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
      showAlertDialog(this, { title: `Failed to save config: ${err.message}` });
    }
  }

  private async _savePreferences(preferences: EnergyPreferences) {
    const result = await saveEnergyPreferences(this.hass, preferences);
    fireEvent(this, "value-changed", { value: result });
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      energyCardStyles,
      css`
        .row {
          height: 58px;
        }
        .content {
          display: flex;
          flex-direction: column;
        }
        .label {
          overflow: hidden;
          text-overflow: ellipsis;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-energy-battery-settings": EnergyBatterySettings;
  }
}
