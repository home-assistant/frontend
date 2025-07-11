import "@material/mwc-button/mwc-button";
import { mdiDevices } from "@mdi/js";
import type { CSSResultGroup } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../../common/dom/fire_event";
import { stopPropagation } from "../../../../common/dom/stop_propagation";
import "../../../../components/entity/ha-entity-picker";
import "../../../../components/entity/ha-statistic-picker";
import "../../../../components/ha-dialog";
import "../../../../components/ha-radio";
import "../../../../components/ha-select";
import "../../../../components/ha-list-item";
import type { DeviceConsumptionEnergyPreference } from "../../../../data/energy";
import { energyStatisticHelpUrl } from "../../../../data/energy";
import { getStatisticLabel } from "../../../../data/recorder";
import { getSensorDeviceClassConvertibleUnits } from "../../../../data/sensor";
import type { HassDialog } from "../../../../dialogs/make-dialog-manager";
import { haStyleDialog } from "../../../../resources/styles";
import type { HomeAssistant } from "../../../../types";
import type { EnergySettingsDeviceDialogParams } from "./show-dialogs-energy";

const energyUnitClasses = ["energy"];

@customElement("dialog-energy-device-settings")
export class DialogEnergyDeviceSettings
  extends LitElement
  implements HassDialog<EnergySettingsDeviceDialogParams>
{
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _params?: EnergySettingsDeviceDialogParams;

  @state() private _device?: DeviceConsumptionEnergyPreference;

  @state() private _energy_units?: string[];

  @state() private _error?: string;

  private _excludeList?: string[];

  private _possibleParents: DeviceConsumptionEnergyPreference[] = [];

  public async showDialog(
    params: EnergySettingsDeviceDialogParams
  ): Promise<void> {
    this._params = params;
    this._device = this._params.device;
    this._computePossibleParents();
    this._energy_units = (
      await getSensorDeviceClassConvertibleUnits(this.hass, "energy")
    ).units;
    this._excludeList = this._params.device_consumptions
      .map((entry) => entry.stat_consumption)
      .filter((id) => id !== this._device?.stat_consumption);
  }

  private _computePossibleParents() {
    if (!this._device || !this._params) {
      this._possibleParents = [];
      return;
    }
    const children: string[] = [];
    const devices = this._params.device_consumptions;
    function getChildren(stat) {
      devices.forEach((d) => {
        if (d.included_in_stat === stat) {
          children.push(d.stat_consumption);
          getChildren(d.stat_consumption);
        }
      });
    }
    getChildren(this._device.stat_consumption);
    this._possibleParents = this._params.device_consumptions.filter(
      (d) =>
        d.stat_consumption !== this._device!.stat_consumption &&
        d.stat_consumption !== this._params?.device?.stat_consumption &&
        !children.includes(d.stat_consumption)
    );
  }

  public closeDialog() {
    this._params = undefined;
    this._device = undefined;
    this._error = undefined;
    this._excludeList = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
    return true;
  }

  protected render() {
    if (!this._params) {
      return nothing;
    }

    const pickableUnit = this._energy_units?.join(", ") || "";

    return html`
      <ha-dialog
        open
        .heading=${html`<ha-svg-icon
            .path=${mdiDevices}
            style="--mdc-icon-size: 32px;"
          ></ha-svg-icon>
          ${this.hass.localize(
            "ui.panel.config.energy.device_consumption.dialog.header"
          )}`}
        @closed=${this.closeDialog}
      >
        ${this._error ? html`<p class="error">${this._error}</p>` : ""}
        <div>
          ${this.hass.localize(
            "ui.panel.config.energy.device_consumption.dialog.selected_stat_intro",
            { unit: pickableUnit }
          )}
        </div>

        <ha-statistic-picker
          .hass=${this.hass}
          .helpMissingEntityUrl=${energyStatisticHelpUrl}
          .includeUnitClass=${energyUnitClasses}
          .value=${this._device?.stat_consumption}
          .label=${this.hass.localize(
            "ui.panel.config.energy.device_consumption.dialog.device_consumption_energy"
          )}
          .excludeStatistics=${this._excludeList}
          @value-changed=${this._statisticChanged}
          dialogInitialFocus
        ></ha-statistic-picker>

        <ha-textfield
          .label=${this.hass.localize(
            "ui.panel.config.energy.device_consumption.dialog.display_name"
          )}
          type="text"
          .disabled=${!this._device}
          .value=${this._device?.name || ""}
          .placeholder=${this._device
            ? getStatisticLabel(
                this.hass,
                this._device.stat_consumption,
                this._params?.statsMetadata?.[this._device.stat_consumption]
              )
            : ""}
          @input=${this._nameChanged}
        >
        </ha-textfield>

        <ha-select
          .label=${this.hass.localize(
            "ui.panel.config.energy.device_consumption.dialog.included_in_device"
          )}
          .value=${this._device?.included_in_stat || ""}
          .helper=${this.hass.localize(
            "ui.panel.config.energy.device_consumption.dialog.included_in_device_helper"
          )}
          .disabled=${!this._device}
          @selected=${this._parentSelected}
          @closed=${stopPropagation}
          fixedMenuPosition
          naturalMenuWidth
          clearable
        >
          ${!this._possibleParents.length
            ? html`
                <ha-list-item disabled value="-"
                  >${this.hass.localize(
                    "ui.panel.config.energy.device_consumption.dialog.no_upstream_devices"
                  )}</ha-list-item
                >
              `
            : this._possibleParents.map(
                (stat) => html`
                  <ha-list-item .value=${stat.stat_consumption}
                    >${stat.name ||
                    getStatisticLabel(
                      this.hass,
                      stat.stat_consumption,
                      this._params?.statsMetadata?.[stat.stat_consumption]
                    )}</ha-list-item
                  >
                `
              )}
        </ha-select>

        <mwc-button @click=${this.closeDialog} slot="secondaryAction">
          ${this.hass.localize("ui.common.cancel")}
        </mwc-button>
        <mwc-button
          @click=${this._save}
          .disabled=${!this._device}
          slot="primaryAction"
        >
          ${this.hass.localize("ui.common.save")}
        </mwc-button>
      </ha-dialog>
    `;
  }

  private _statisticChanged(ev: CustomEvent<{ value: string }>) {
    if (!ev.detail.value) {
      this._device = undefined;
      return;
    }
    this._device = { stat_consumption: ev.detail.value };
    this._computePossibleParents();
  }

  private _nameChanged(ev) {
    const newDevice = {
      ...this._device!,
      name: ev.target!.value,
    } as DeviceConsumptionEnergyPreference;
    if (!newDevice.name) {
      delete newDevice.name;
    }
    this._device = newDevice;
  }

  private _parentSelected(ev) {
    const newDevice = {
      ...this._device!,
      included_in_stat: ev.target!.value,
    } as DeviceConsumptionEnergyPreference;
    if (!newDevice.included_in_stat) {
      delete newDevice.included_in_stat;
    }
    this._device = newDevice;
  }

  private async _save() {
    try {
      await this._params!.saveCallback(this._device!);
      this.closeDialog();
    } catch (err: any) {
      this._error = err.message;
    }
  }

  static get styles(): CSSResultGroup {
    return [
      haStyleDialog,
      css`
        ha-statistic-picker {
          width: 100%;
        }
        ha-select {
          margin-top: 16px;
          width: 100%;
        }
        ha-textfield {
          margin-top: 16px;
          width: 100%;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-energy-device-settings": DialogEnergyDeviceSettings;
  }
}
