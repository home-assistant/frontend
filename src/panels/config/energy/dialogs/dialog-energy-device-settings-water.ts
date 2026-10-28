import type { CSSResultGroup } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/entity/ha-entity-picker";
import "../../../../components/entity/ha-statistic-picker";
import "../../../../components/ha-button";
import "../../../../components/ha-dialog";
import "../../../../components/ha-dialog-footer";
import "../../../../components/input/ha-input";
import "./ha-energy-upstream-device-picker";
import type { HaInput } from "../../../../components/input/ha-input";
import type { DeviceConsumptionEnergyPreference } from "../../../../data/energy";
import {
  computeEnergyLabel,
  energyStatisticHelpUrl,
} from "../../../../data/energy";
import {
  getStatisticMetadata,
  isExternalStatistic,
} from "../../../../data/recorder";
import { getSensorDeviceClassConvertibleUnits } from "../../../../data/sensor";
import type { HassDialog } from "../../../../dialogs/make-dialog-manager";
import { DirtyStateProviderMixin } from "../../../../mixins/dirty-state-provider-mixin";
import { haStyleDialog } from "../../../../resources/styles";
import type { HomeAssistant, ValueChangedEvent } from "../../../../types";
import type { IntegralUnits } from "./energy-integral";
import { confirmIntegrals, integralUnits } from "./energy-integral";
import type { EnergySettingsDeviceWaterDialogParams } from "./show-dialogs-energy";

const volumeUnitClasses = ["volume"];
const flowRateUnitClasses = ["volume_flow_rate"];

// Without a water sensor, saving offers to create one from the flow rate sensor
type DeviceConsumptionDraft = Partial<DeviceConsumptionEnergyPreference>;

@customElement("dialog-energy-device-settings-water")
export class DialogEnergyDeviceSettingsWater
  extends DirtyStateProviderMixin<DeviceConsumptionDraft | null>()(LitElement)
  implements HassDialog<EnergySettingsDeviceWaterDialogParams>
{
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _params?: EnergySettingsDeviceWaterDialogParams;

  @state() private _open = false;

  @state() private _device?: DeviceConsumptionDraft;

  @state() private _volume_units?: string[];

  @state() private _flow_rate_units?: string[];

  @state() private _error?: string;

  @state() private _saving = false;

  private _excludeList?: string[];

  private _excludeListFlowRate?: string[];

  private _possibleParents: DeviceConsumptionEnergyPreference[] = [];

  public async showDialog(
    params: EnergySettingsDeviceWaterDialogParams
  ): Promise<void> {
    this._params = params;
    this._device = this._params.device;
    this._error = undefined;
    this._saving = false;
    this._computePossibleParents();
    this._volume_units = (
      await getSensorDeviceClassConvertibleUnits(this.hass, "water")
    ).units;
    this._flow_rate_units = (
      await getSensorDeviceClassConvertibleUnits(this.hass, "volume_flow_rate")
    ).units;
    this._excludeList = this._params.device_consumptions
      .map((entry) => entry.stat_consumption)
      .filter((id) => id !== this._device?.stat_consumption);
    this._excludeListFlowRate = this._params.device_consumptions
      .map((entry) => entry.stat_rate)
      .filter((id) => id && id !== this._device?.stat_rate) as string[];

    this._open = true;
    this._initDirtyTracking({ type: "deep" }, this._device ?? null);
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
    // Saving without a water sensor can reuse the original one
    const stat =
      this._device.stat_consumption ?? this._params.device?.stat_consumption;
    if (stat) {
      getChildren(stat);
    }
    this._possibleParents = this._params.device_consumptions.filter(
      (d) =>
        d.stat_consumption !== this._device!.stat_consumption &&
        d.stat_consumption !== this._params?.device?.stat_consumption &&
        !children.includes(d.stat_consumption)
    );
  }

  public closeDialog() {
    this._open = false;
    return true;
  }

  private _dialogClosed() {
    this._params = undefined;
    this._device = undefined;
    this._error = undefined;
    this._excludeList = undefined;
    this._excludeListFlowRate = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  protected render() {
    if (!this._params) {
      return nothing;
    }

    const pickableUnit = this._volume_units?.join(", ") || "";

    const labelStatistic =
      this._device?.stat_consumption ?? this._device?.stat_rate;

    return html`
      <ha-dialog
        .open=${this._open}
        header-title=${this.hass.localize(
          "ui.panel.config.energy.device_consumption_water.dialog.header"
        )}
        .preventScrimClose=${this.isDirtyState}
        @closed=${this._dialogClosed}
      >
        ${this._error ? html`<p class="error">${this._error}</p>` : ""}

        <ha-statistic-picker
          .helpMissingEntityUrl=${energyStatisticHelpUrl}
          .includeUnitClass=${volumeUnitClasses}
          .value=${this._device?.stat_consumption}
          .label=${this.hass.localize(
            "ui.panel.config.energy.device_consumption_water.dialog.device_consumption_water"
          )}
          .excludeStatistics=${this._excludeList}
          @value-changed=${this._statisticChanged}
          .disabled=${this._saving}
          .helper=${this.hass.localize(
            "ui.panel.config.energy.device_consumption_water.dialog.selected_stat_intro",
            { unit: pickableUnit }
          )}
          autofocus
        ></ha-statistic-picker>

        <ha-statistic-picker
          .includeUnitClass=${flowRateUnitClasses}
          .value=${this._device?.stat_rate}
          .label=${this.hass.localize(
            "ui.panel.config.energy.device_consumption_water.dialog.device_consumption_water_flow_rate"
          )}
          .excludeStatistics=${this._excludeListFlowRate}
          @value-changed=${this._flowRateStatisticChanged}
          .disabled=${this._saving}
          .invalid=${!!this._flowRateError()}
          .errorMessage=${this._flowRateError()}
          .helper=${this.hass.localize(
            "ui.panel.config.energy.device_consumption_water.dialog.selected_stat_intro",
            { unit: this._flow_rate_units?.join(", ") || "" }
          )}
        ></ha-statistic-picker>

        <ha-input
          .label=${this.hass.localize(
            "ui.panel.config.energy.device_consumption_water.dialog.display_name"
          )}
          type="text"
          .disabled=${!this._device || this._saving}
          .value=${this._device?.name || ""}
          .placeholder=${
            labelStatistic
              ? computeEnergyLabel(
                  this.hass.states,
                  this.hass.formatEntityName,
                  labelStatistic,
                  this._params?.statsMetadata?.[labelStatistic]
                )
              : ""
          }
          @input=${this._nameChanged}
        >
        </ha-input>

        <ha-energy-upstream-device-picker
          .hass=${this.hass}
          .label=${this.hass.localize(
            "ui.panel.config.energy.device_consumption_water.dialog.included_in_device"
          )}
          .helper=${this.hass.localize(
            "ui.panel.config.energy.device_consumption_water.dialog.included_in_device_helper"
          )}
          .value=${this._device?.included_in_stat}
          .possibleParents=${this._possibleParents}
          .statsMetadata=${this._params.statsMetadata}
          .emptyLabel=${this.hass.localize(
            "ui.panel.config.energy.device_consumption_water.dialog.no_upstream_devices"
          )}
          .disabled=${!this._device || this._saving}
          @value-changed=${this._parentChanged}
        ></ha-energy-upstream-device-picker>

        <ha-dialog-footer slot="footer">
          <ha-button
            appearance="plain"
            @click=${this.closeDialog}
            slot="secondaryAction"
          >
            ${this.hass.localize("ui.common.cancel")}
          </ha-button>
          <ha-button
            @click=${this._save}
            .disabled=${
              this._saving ||
              !(this._device?.stat_consumption || this._integralUnits()) ||
              (!!this._params?.device && !this.isDirtyState)
            }
            .loading=${this._saving}
            slot="primaryAction"
          >
            ${this.hass.localize("ui.common.save")}
          </ha-button>
        </ha-dialog-footer>
      </ha-dialog>
    `;
  }

  private async _statisticChanged(ev: ValueChangedEvent<string>) {
    const device: DeviceConsumptionDraft = { ...this._device };
    if (ev.detail.value) {
      device.stat_consumption = ev.detail.value;
    } else {
      delete device.stat_consumption;
    }
    this._device =
      device.stat_consumption || device.stat_rate ? device : undefined;
    this._computePossibleParents();
    // The new water sensor can rule out the picked upstream device
    if (
      device.included_in_stat &&
      !this._possibleParents.some(
        (parent) => parent.stat_consumption === device.included_in_stat
      )
    ) {
      delete device.included_in_stat;
    }
    this._updateDirtyState(this._device ?? null);

    if (
      ev.detail.value &&
      isExternalStatistic(ev.detail.value) &&
      this._params?.statsMetadata &&
      !(ev.detail.value in this._params.statsMetadata)
    ) {
      const [metadata] = await getStatisticMetadata(this.hass.callWS, [
        ev.detail.value,
      ]);
      if (metadata) {
        this._params.statsMetadata[ev.detail.value] = metadata;
        this.requestUpdate("_params");
      }
    }
  }

  private _flowRateStatisticChanged(ev: ValueChangedEvent<string>) {
    const newDevice: DeviceConsumptionDraft = {
      ...this._device,
      stat_rate: ev.detail.value,
    };
    if (!newDevice.stat_rate) {
      delete newDevice.stat_rate;
    }
    this._device =
      newDevice.stat_consumption || newDevice.stat_rate ? newDevice : undefined;
    this._computePossibleParents();
    this._updateDirtyState(this._device ?? null);
  }

  private _nameChanged(ev: InputEvent) {
    const newDevice: DeviceConsumptionDraft = {
      ...this._device!,
      name: (ev.target as HaInput).value,
    };
    if (!newDevice.name) {
      delete newDevice.name;
    }
    this._device = newDevice;
    this._updateDirtyState(this._device);
  }

  private _parentChanged(ev: ValueChangedEvent<string>) {
    const newDevice: DeviceConsumptionDraft = {
      ...this._device!,
      included_in_stat: ev.detail.value,
    };
    if (!newDevice.included_in_stat) {
      delete newDevice.included_in_stat;
    }
    this._device = newDevice;
    this._updateDirtyState(this._device);
  }

  private _flowRateError(): string | undefined {
    if (
      this._device?.stat_consumption ||
      !this._device?.stat_rate ||
      !this._volume_units ||
      this._integralUnits()
    ) {
      return undefined;
    }
    return this.hass.localize(
      "ui.panel.config.energy.device_consumption_water.dialog.flow_rate_no_volume"
    );
  }

  private _integralUnits(): IntegralUnits | undefined {
    const statRate = this._device?.stat_rate;
    if (!statRate || !this._volume_units) {
      return undefined;
    }
    return integralUnits(
      this.hass.states[statRate]?.attributes.unit_of_measurement,
      this._volume_units
    );
  }

  private async _save() {
    // Closing or reopening the dialog replaces its state, but a created helper
    // must still be saved with the submitted device
    const params = this._params!;
    const draft = this._device!;
    const isCurrent = () => this._params === params;
    this._error = undefined;
    this._saving = true;
    try {
      const statConsumption =
        draft.stat_consumption ?? (await this._waterFromFlowRate(draft));
      if (!statConsumption) {
        return;
      }
      const device = { ...draft, stat_consumption: statConsumption };
      if (isCurrent()) {
        this._device = device;
        this._updateDirtyState(device);
      }
      await params.saveCallback(device);
      if (isCurrent()) {
        this._markDirtyStateClean();
        this.closeDialog();
      }
    } catch (err: any) {
      if (isCurrent()) {
        this._error = err.message;
      }
    } finally {
      if (isCurrent()) {
        this._saving = false;
      }
    }
  }

  private async _waterFromFlowRate(
    draft: DeviceConsumptionDraft
  ): Promise<string | undefined> {
    const statRate = draft.stat_rate!;
    const units = this._integralUnits();
    if (!units) {
      return undefined;
    }
    const sensors = await confirmIntegrals(this, this.hass, {
      deviceClass: "water",
      states: this.hass.states,
      entities: this.hass.entities,
      requests: [
        {
          rate: statRate,
          units,
          name: this.hass.localize(
            "ui.panel.config.energy.integral.water.sensor_name",
            {
              name: computeEnergyLabel(
                this.hass.states,
                this.hass.formatEntityName,
                statRate,
                this._params?.statsMetadata?.[statRate],
                draft.name
              ),
            }
          ),
        },
      ],
      intro: this.hass.localize(
        "ui.panel.config.energy.device_consumption_water.dialog.water_sensor_needed"
      ),
      exclude: this._excludeList,
      statsMetadata: this._params?.statsMetadata,
    });
    return sensors?.[0];
  }

  static get styles(): CSSResultGroup {
    return [
      haStyleDialog,
      css`
        ha-statistic-picker {
          display: block;
          width: 100%;
          margin-bottom: var(--ha-space-4);
        }
        ha-energy-upstream-device-picker {
          display: block;
          margin-top: var(--ha-space-4);
          width: 100%;
        }
        ha-input {
          margin-top: var(--ha-space-4);
          --ha-input-padding-bottom: 0;
          width: 100%;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-energy-device-settings-water": DialogEnergyDeviceSettingsWater;
  }
}
