import { mdiDelete, mdiDevices, mdiDrag, mdiPencil, mdiPlus } from "@mdi/js";
import type { CSSResultGroup, TemplateResult } from "lit";
import { css, html, LitElement } from "lit";
import { repeat } from "lit/directives/repeat";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-card";
import "../../../../components/ha-button";
import "../../../../components/ha-icon-button";
import "../../../../components/ha-sortable";
import "../../../../components/ha-svg-icon";
import type {
  DeviceConsumptionEnergyPreference,
  EnergyPreferences,
  EnergyPreferencesValidation,
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
          <ha-sortable handle-selector=".handle" @item-moved=${this._itemMoved}>
            <div class="devices">
              ${repeat(
                this.preferences.device_consumption,
                (device) => device.stat_consumption,
                (device) => html`
                  <div class="row" .device=${device}>
                    <div class="handle">
                      <ha-svg-icon .path=${mdiDrag}></ha-svg-icon>
                    </div>
                    <span class="content"
                      >${device.name ||
                      getStatisticLabel(
                        this.hass,
                        device.stat_consumption,
                        this.statsMetadata?.[device.stat_consumption]
                      )}</span
                    >
                    <ha-icon-button
                      .label=${this.hass.localize("ui.common.edit")}
                      @click=${this._editDevice}
                      .path=${mdiPencil}
                    ></ha-icon-button>
                    <ha-icon-button
                      .label=${this.hass.localize("ui.common.delete")}
                      @click=${this._deleteDevice}
                      .device=${device}
                      .path=${mdiDelete}
                    ></ha-icon-button>
                  </div>
                `
              )}
            </div>
          </ha-sortable>
          <div class="row">
            <ha-svg-icon .path=${mdiDevices}></ha-svg-icon>
            <ha-button
              @click=${this._addDevice}
              appearance="filled"
              size="small"
            >
              <ha-svg-icon slot="prefix" .path=${mdiPlus}></ha-svg-icon
              >${this.hass.localize(
                "ui.panel.config.energy.device_consumption.add_device"
              )}</ha-button
            >
          </div>
        </div>
      </ha-card>
    `;
  }

  private _itemMoved(ev: CustomEvent): void {
    ev.stopPropagation();
    const { oldIndex, newIndex } = ev.detail;
    const devices = this.preferences.device_consumption.concat();
    const device = devices.splice(oldIndex, 1)[0];
    devices.splice(newIndex, 0, device);

    const newPrefs = {
      ...this.preferences,
      device_consumption: devices,
    };
    fireEvent(this, "value-changed", { value: newPrefs });
    this._savePreferences(newPrefs);
  }

  private _editDevice(ev) {
    const origDevice: DeviceConsumptionEnergyPreference =
      ev.currentTarget.closest(".row").device;
    showEnergySettingsDeviceDialog(this, {
      statsMetadata: this.statsMetadata,
      device: { ...origDevice },
      device_consumptions: this.preferences
        .device_consumption as DeviceConsumptionEnergyPreference[],
      saveCallback: async (newDevice) => {
        const newPrefs = {
          ...this.preferences,
          device_consumption: this.preferences.device_consumption.map((d) =>
            d === origDevice ? newDevice : d
          ),
        };
        this._sanitizeParents(newPrefs);
        await this._savePreferences(newPrefs);
      },
    });
  }

  private _addDevice() {
    showEnergySettingsDeviceDialog(this, {
      statsMetadata: this.statsMetadata,
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

  private _sanitizeParents(prefs: EnergyPreferences) {
    const statIds = prefs.device_consumption.map((d) => d.stat_consumption);
    prefs.device_consumption.forEach((d) => {
      if (d.included_in_stat && !statIds.includes(d.included_in_stat)) {
        delete d.included_in_stat;
      }
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
      const newPrefs = {
        ...this.preferences,
        device_consumption: this.preferences.device_consumption.filter(
          (device) => device !== deviceToDelete
        ),
      };
      this._sanitizeParents(newPrefs);
      await this._savePreferences(newPrefs);
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
        .handle {
          cursor: move; /* fallback if grab cursor is unsupported */
          cursor: grab;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-energy-device-settings": EnergyDeviceSettings;
  }
}
