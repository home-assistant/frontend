import type { CSSResultGroup } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { mdiRestore } from "@mdi/js";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-icon-button";
import "../../../../components/entity/ha-entity-picker";
import "../../../../components/entity/ha-statistic-picker";
import "../../../../components/ha-button";
import "../../../../components/ha-dialog";
import "../../../../components/ha-dialog-footer";
import "../../../../components/input/ha-input";
import "../../../../components/ha-input-helper-text";
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
import type { EnergySettingsDeviceDialogParams } from "./show-dialogs-energy";
import { getGraphColorByIndex } from "../../../../common/color/colors";
import { rgb2hex } from "../../../../common/color/convert-color";

const energyUnitClasses = ["energy"];
const powerUnitClasses = ["power"];

// Without an energy sensor, saving offers to create one from the power sensor
type DeviceConsumptionDraft = Partial<DeviceConsumptionEnergyPreference>;

@customElement("dialog-energy-device-settings")
export class DialogEnergyDeviceSettings
  extends DirtyStateProviderMixin<DeviceConsumptionDraft | null>()(LitElement)
  implements HassDialog<EnergySettingsDeviceDialogParams>
{
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _params?: EnergySettingsDeviceDialogParams;

  @state() private _open = false;

  @state() private _device?: DeviceConsumptionDraft;

  @state() private _energy_units?: string[];

  @state() private _power_units?: string[];

  @state() private _error?: string;

  @state() private _saving = false;

  private _excludeList?: string[];

  private _excludeListPower?: string[];

  private _possibleParents: DeviceConsumptionEnergyPreference[] = [];

  public async showDialog(
    params: EnergySettingsDeviceDialogParams
  ): Promise<void> {
    this._params = params;
    this._device = this._params.device;
    this._error = undefined;
    this._saving = false;
    this._computePossibleParents();
    this._energy_units = (
      await getSensorDeviceClassConvertibleUnits(this.hass, "energy")
    ).units;
    this._power_units = (
      await getSensorDeviceClassConvertibleUnits(this.hass, "power")
    ).units;
    this._excludeList = this._params.device_consumptions
      .map((entry) => entry.stat_consumption)
      .filter((id) => id !== this._device?.stat_consumption);
    this._excludeListPower = this._params.device_consumptions
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
    // Saving without an energy sensor can reuse the original one
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
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  protected render() {
    if (!this._params) {
      return nothing;
    }

    const labelStatistic =
      this._device?.stat_consumption ?? this._device?.stat_rate;

    return html`
      <ha-dialog
        .open=${this._open}
        header-title=${this.hass.localize(
          "ui.panel.config.energy.device_consumption.dialog.header"
        )}
        .preventScrimClose=${this.isDirtyState}
        @closed=${this._dialogClosed}
      >
        ${this._error ? html`<p class="error">${this._error}</p>` : ""}

        <ha-statistic-picker
          .helpMissingEntityUrl=${energyStatisticHelpUrl}
          .includeUnitClass=${energyUnitClasses}
          .value=${this._device?.stat_consumption}
          .label=${this.hass.localize(
            "ui.panel.config.energy.device_consumption.dialog.device_consumption_energy"
          )}
          .excludeStatistics=${this._excludeList}
          @value-changed=${this._statisticChanged}
          .disabled=${this._saving}
          .helper=${this.hass.localize(
            "ui.panel.config.energy.device_consumption.dialog.selected_stat_intro",
            { unit: this._energy_units?.join(", ") || "" }
          )}
          autofocus
        ></ha-statistic-picker>

        <ha-statistic-picker
          .includeUnitClass=${powerUnitClasses}
          .value=${this._device?.stat_rate}
          .label=${this.hass.localize(
            "ui.panel.config.energy.device_consumption.dialog.device_consumption_power"
          )}
          .excludeStatistics=${this._excludeListPower}
          @value-changed=${this._powerStatisticChanged}
          .disabled=${this._saving}
          .helper=${this.hass.localize(
            "ui.panel.config.energy.device_consumption.dialog.selected_stat_intro",
            { unit: this._power_units?.join(", ") || "" }
          )}
        ></ha-statistic-picker>

        <ha-input
          .label=${this.hass.localize(
            "ui.panel.config.energy.device_consumption.dialog.display_name"
          )}
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

        <div class="color-field">
          <div class="color-row">
            <ha-input
              type="color"
              .disabled=${!this._device}
              .label=${this.hass.localize(
                "ui.panel.config.energy.device_consumption.dialog.color"
              )}
              .value=${
                this._device?.color
                  ? rgb2hex(this._device.color)
                  : this._defaultColor
              }
              @change=${this._colorInputChanged}
            ></ha-input>
            ${
              this._device?.color
                ? html`<ha-icon-button
                    .path=${mdiRestore}
                    .label=${this.hass.localize(
                      "ui.panel.config.energy.device_consumption.dialog.color_reset"
                    )}
                    @click=${this._resetColor}
                  ></ha-icon-button>`
                : nothing
            }
          </div>
          <ha-input-helper-text>
            <span class="helper">
              ${this.hass.localize(
                "ui.panel.config.energy.device_consumption.dialog.color_helper"
              )}
            </span>
          </ha-input-helper-text>
        </div>

        <ha-energy-upstream-device-picker
          .hass=${this.hass}
          .label=${this.hass.localize(
            "ui.panel.config.energy.device_consumption.dialog.included_in_device"
          )}
          .helper=${this.hass.localize(
            "ui.panel.config.energy.device_consumption.dialog.included_in_device_helper"
          )}
          .value=${this._device?.included_in_stat}
          .possibleParents=${this._possibleParents}
          .statsMetadata=${this._params.statsMetadata}
          .emptyLabel=${this.hass.localize(
            "ui.panel.config.energy.device_consumption.dialog.no_upstream_devices"
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

  private get _defaultColor(): string {
    if (!this._device) {
      return "#9e9e9e";
    }
    const devices = this._params?.device_consumptions ?? [];
    const statConsumption =
      this._params?.device?.stat_consumption ?? this._device.stat_consumption;
    const idx = devices.findIndex(
      (d) => d.stat_consumption === statConsumption
    );
    return getGraphColorByIndex(
      idx === -1 ? devices.length : idx,
      getComputedStyle(this)
    );
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
    // The new energy sensor can rule out the picked upstream device
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

  private _powerStatisticChanged(ev: ValueChangedEvent<string>) {
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

  private _colorInputChanged(ev: Event) {
    if (!this._device) {
      return;
    }

    const value = (ev.target as HaInput).value;

    if (!value) {
      return;
    }

    const hex = value.replace("#", "");
    const color: [number, number, number] = [
      parseInt(hex.slice(0, 2), 16),
      parseInt(hex.slice(2, 4), 16),
      parseInt(hex.slice(4, 6), 16),
    ];

    this._device = { ...this._device, color };
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

  private _integralUnits(): IntegralUnits | undefined {
    const statRate = this._device?.stat_rate;
    if (!statRate || !this._energy_units) {
      return undefined;
    }
    return integralUnits(
      this.hass.states[statRate]?.attributes.unit_of_measurement,
      this._energy_units
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
        draft.stat_consumption ?? (await this._energyFromPower(draft));
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

  private async _energyFromPower(
    draft: DeviceConsumptionDraft
  ): Promise<string | undefined> {
    const statRate = draft.stat_rate!;
    const units = this._integralUnits();
    if (!units) {
      return undefined;
    }
    const sensors = await confirmIntegrals(this, this.hass, {
      deviceClass: "energy",
      states: this.hass.states,
      entities: this.hass.entities,
      requests: [
        {
          rate: statRate,
          units,
          name: this.hass.localize(
            "ui.panel.config.energy.integral.energy.sensor_name",
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
        "ui.panel.config.energy.device_consumption.dialog.energy_sensor_needed"
      ),
      exclude: this._excludeList,
      statsMetadata: this._params?.statsMetadata,
    });
    return sensors?.[0];
  }

  private _resetColor() {
    const device = { ...this._device! };
    delete device.color;
    this._device = device;
    this._updateDirtyState(device);
  }

  static get styles(): CSSResultGroup {
    return [
      haStyleDialog,
      css`
        ha-statistic-picker {
          display: block;
          margin-bottom: var(--ha-space-2);
        }
        ha-statistic-picker {
          width: 100%;
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
        .color-field {
          margin-top: var(--ha-space-4);
          width: 100%;
        }
        .color-row {
          display: flex;
          align-items: center;
          gap: var(--ha-space-2);
        }
        .color-row ha-input {
          flex: 1;
          margin-top: 0;
        }
        ha-input-helper-text {
          display: block;
          margin: var(--ha-space-2) 0 0;
        }
        ha-input-helper-text .helper {
          display: block;
          color: var(--secondary-text-color);
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
