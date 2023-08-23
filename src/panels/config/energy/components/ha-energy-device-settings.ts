import "@material/mwc-button/mwc-button";
import { mdiDelete, mdiDevices } from "@mdi/js";
import { CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-card";
import "../../../../components/ha-icon-button";
import "../../../../components/ha-state-icon";
import {
  DeviceConsumptionEnergyPreference,
  EnergyPreferences,
  EnergyPreferencesValidation,
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
import { showEnergySettingsDeviceDialog } from "../dialogs/show-dialogs-energy";
import "./ha-energy-validation-result";
import { energyCardStyles } from "./styles";

@customElement("ha-energy-device-settings")
export class EnergyDeviceSettings extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false })
  public preferences!: EnergyPreferences;

  @property({ attribute: false })
  public statsMetadata?: Record<string, StatisticsMetaData>;

  @property({ attribute: false })
  public validationResult?: EnergyPreferencesValidation;

  protected render(): TemplateResult {
    return html`
      <ha-card outlined>
        <h1 class="card-header">
          <ha-svg-icon .path=${mdiDevices}></ha-svg-icon>
          ${this.hass.localize(
            "ui.panel.config.energy.device_consumption.title"
          )}
        </h1>

        <div class="card-content">
          <p>
            ${this.hass.localize(
              "ui.panel.config.energy.device_consumption.sub"
            )}
            <a
              target="_blank"
              rel="noopener noreferrer"
              href=${documentationUrl(
                this.hass,
                "/docs/energy/individual-devices/"
              )}
              >${this.hass.localize(
                "ui.panel.config.energy.device_consumption.learn_more"
              )}</a
            >
          </p>
          ${this.validationResult?.device_consumption.map(
            (result) => html`
              <ha-energy-validation-result
                .hass=${this.hass}
                .issues=${result}
              ></ha-energy-validation-result>
            `
          )}
          <h3>
            ${this.hass.localize(
              "ui.panel.config.energy.device_consumption.devices"
            )}
          </h3>
          ${this.preferences.device_consumption.map((device) => {
            const entityState = this.hass.states[device.stat_consumption];
            return html`
              <div class="row">
                <ha-state-icon .state=${entityState}></ha-state-icon>
                <span class="content"
                  >${getStatisticLabel(
                    this.hass,
                    device.stat_consumption,
                    this.statsMetadata?.[device.stat_consumption]
                  )}</span
                >
                <ha-icon-button
                  .label=${this.hass.localize("ui.common.delete")}
                  @click=${this._deleteDevice}
                  .device=${device}
                  .path=${mdiDelete}
                ></ha-icon-button>
              </div>
            `;
          })}
          <div class="row">
            <ha-svg-icon .path=${mdiDevices}></ha-svg-icon>
            <mwc-button @click=${this._addDevice}
              >${this.hass.localize(
                "ui.panel.config.energy.device_consumption.add_device"
              )}</mwc-button
            >
          </div>
        </div>
      </ha-card>
    `;
  }

  private _addDevice() {
    showEnergySettingsDeviceDialog(this, {
      device_consumptions: this.preferences
        .device_consumption as DeviceConsumptionEnergyPreference[],
      saveCallback: async (device) => {
        await this._savePreferences({
          ...this.preferences,
          device_consumption:
            this.preferences.device_consumption.concat(device),
        });
      },
    });
  }

  private async _deleteDevice(ev) {
    const deviceToDelete: DeviceConsumptionEnergyPreference =
      ev.currentTarget.device;

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
        device_consumption: this.preferences.device_consumption.filter(
          (device) => device !== deviceToDelete
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
    return [haStyle, energyCardStyles];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-energy-device-settings": EnergyDeviceSettings;
  }
}
