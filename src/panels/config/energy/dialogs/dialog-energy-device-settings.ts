import "@material/mwc-button/mwc-button";
import { mdiDevices } from "@mdi/js";
import { css, CSSResultGroup, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/entity/ha-entity-picker";
import "../../../../components/entity/ha-statistic-picker";
import "../../../../components/ha-dialog";
import "../../../../components/ha-formfield";
import "../../../../components/ha-radio";
import {
  DeviceConsumptionEnergyPreference,
  energyStatisticHelpUrl,
} from "../../../../data/energy";
import { getSensorDeviceClassConvertibleUnits } from "../../../../data/sensor";
import { HassDialog } from "../../../../dialogs/make-dialog-manager";
import { haStyleDialog } from "../../../../resources/styles";
import { HomeAssistant } from "../../../../types";
import { EnergySettingsDeviceDialogParams } from "./show-dialogs-energy";

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

  public async showDialog(
    params: EnergySettingsDeviceDialogParams
  ): Promise<void> {
    this._params = params;
    this._energy_units = (
      await getSensorDeviceClassConvertibleUnits(this.hass, "energy")
    ).units;
    this._excludeList = this._params.device_consumptions.map(
      (entry) => entry.stat_consumption
    );
  }

  public closeDialog(): void {
    this._params = undefined;
    this._device = undefined;
    this._error = undefined;
    this._excludeList = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
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
          .label=${this.hass.localize(
            "ui.panel.config.energy.device_consumption.dialog.device_consumption_energy"
          )}
          .excludeStatistics=${this._excludeList}
          @value-changed=${this._statisticChanged}
          dialogInitialFocus
        ></ha-statistic-picker>

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
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-energy-device-settings": DialogEnergyDeviceSettings;
  }
}
