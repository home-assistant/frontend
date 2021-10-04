import "@material/mwc-button/mwc-button";
import { mdiDelete, mdiDevices } from "@mdi/js";
import { CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../../../../common/dom/fire_event";
import { computeStateName } from "../../../../common/entity/compute_state_name";
import { stateIcon } from "../../../../common/entity/state_icon";
import "../../../../components/ha-card";
import {
  DeviceConsumptionEnergyPreference,
  EnergyPreferences,
  EnergyPreferencesValidation,
  saveEnergyPreferences,
} from "../../../../data/energy";
import {
  showConfirmationDialog,
  showAlertDialog,
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
  public validationResult?: EnergyPreferencesValidation;

  protected render(): TemplateResult {
    return html`
      <ha-card>
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
            (result) =>
              html`
                <ha-energy-validation-result
                  .hass=${this.hass}
                  .issues=${result}
                ></ha-energy-validation-result>
              `
          )}
          <h3>Devices</h3>
          ${this.preferences.device_consumption.map((device) => {
            const entityState = this.hass.states[device.stat_consumption];
            return html`
              <div class="row">
                <ha-icon .icon=${stateIcon(entityState)}></ha-icon>
                <span class="content"
                  >${entityState
                    ? computeStateName(entityState)
                    : device.stat_consumption}</span
                >
                <mwc-icon-button @click=${this._deleteDevice} .device=${device}>
                  <ha-svg-icon .path=${mdiDelete}></ha-svg-icon>
                </mwc-icon-button>
              </div>
            `;
          })}
          <div class="row">
            <ha-svg-icon .path=${mdiDevices}></ha-svg-icon>
            <mwc-button @click=${this._addDevice}>Add device</mwc-button>
          </div>
        </div>
      </ha-card>
    `;
  }

  private _addDevice() {
    showEnergySettingsDeviceDialog(this, {
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
        title: "Are you sure you want to delete this device?",
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
