import { mdiDevices } from "@mdi/js";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-dialog";
import {
  DeviceConsumptionEnergyPreference,
  emptyDeviceEnergyPreference,
  FlowFromGridSourceEnergyPreference,
} from "../../../../data/energy";
import { HassDialog } from "../../../../dialogs/make-dialog-manager";
import { haStyleDialog } from "../../../../resources/styles";
import { HomeAssistant } from "../../../../types";
import { EnergySettingsDeviceDialogParams } from "./show-dialogs-energy";
import "@material/mwc-button/mwc-button";
import "../../../../components/entity/ha-statistic-picker";
import "../../../../components/ha-radio";
import "../../../../components/ha-formfield";
import "../../../../components/ha-selector/ha-selector";
import { computeStateName } from "../../../../common/entity/compute_state_name";
import { stopPropagation } from "../../../../common/dom/stop_propagation";

const energyUnits = ["kWh"];
const energyDeviceClasses = ["energy"];

@customElement("dialog-energy-device-settings")
export class DialogEnergyDeviceSettings
  extends LitElement
  implements HassDialog<EnergySettingsDeviceDialogParams>
{
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _params?: EnergySettingsDeviceDialogParams;

  @state() private _device?: DeviceConsumptionEnergyPreference;

  @state() private _sources?: FlowFromGridSourceEnergyPreference[];

  @state() private _error?: string;

  public async showDialog(
    params: EnergySettingsDeviceDialogParams
  ): Promise<void> {
    this._params = params;
    this._sources = params.sources;
    this._device = params.device
      ? { ...params.device }
      : emptyDeviceEnergyPreference();
  }

  public closeDialog(): void {
    this._params = undefined;
    this._device = undefined;
    this._error = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  protected render(): TemplateResult {
    if (!this._params) {
      return html``;
    }

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
            `ui.panel.config.energy.device_consumption.dialog.selected_stat_intro`
          )}
        </div>

        <ha-statistic-picker
          .hass=${this.hass}
          .includeUnitOfMeasurement=${energyUnits}
          .includeDeviceClasses=${energyDeviceClasses}
          .value=${this._device?.stat_consumption}
          .label=${this.hass.localize(
            "ui.panel.config.energy.device_consumption.dialog.device_consumption_energy"
          )}
          @value-changed=${this._statisticChanged}
          dialogInitialFocus
        ></ha-statistic-picker>

        <p>
          ${this.hass.localize(
            `ui.panel.config.energy.device_consumption.dialog.from_grid_parent_para`
          )}
        </p>

        <ha-select
          .value=${this._device?.entity_parent_source}
          .label=${this.hass.localize(
            "ui.panel.config.energy.device_consumption.dialog.from_grid_parent"
          )}
          fixedMenuPosition
          naturalMenuWidth
          @selected=${this._parentChanged}
          @closed=${stopPropagation}
        >
          <mwc-list-item
            value="None"
            .selected=${!this._device?.entity_parent_source}
            >${this.hass.localize(
              "ui.panel.config.energy.device_consumption.dialog.no_parent"
            )}</mwc-list-item
          >

          ${this._sources?.map((source) => {
            const entityState = this.hass.states[source.stat_energy_from];
            return html`<mwc-list-item .value=${source.stat_energy_from}>
              ${entityState
                ? computeStateName(entityState)
                : source.stat_energy_from}
            </mwc-list-item>`;
          })}
        </ha-select>

        <mwc-button @click=${this.closeDialog} slot="secondaryAction">
          ${this.hass.localize("ui.common.cancel")}
        </mwc-button>
        <mwc-button
          @click=${this._save}
          .disabled=${!this._device?.stat_consumption}
          slot="primaryAction"
        >
          ${this.hass.localize("ui.common.save")}
        </mwc-button>
      </ha-dialog>
    `;
  }

  private _parentChanged(ev) {
    this._device = {
      ...this._device!,
      entity_parent_source:
        !ev.target.value || ev.target.value === "None" ? null : ev.target.value,
    };
  }

  private _statisticChanged(ev: CustomEvent<{ value: string }>) {
    if (!ev.detail.value) {
      this._device = undefined;
      return;
    }
    this._device = {
      ...this._device!,
      stat_consumption: ev.detail.value,
    };
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
        ha-select,
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
