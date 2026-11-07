import "@home-assistant/webawesome/dist/components/divider/divider";
import type { ContextType } from "@lit/context";
import type { CSSResultGroup, PropertyValues } from "lit";
import { html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { consume } from "../../../../common/decorators/consume";
import { transform } from "../../../../common/decorators/transform";
import { consumeLocalize } from "../../../../common/decorators/consume-context-entry";
import type { LocalizeFunc } from "../../../../common/translations/localize";
import "../../../../components/entity/ha-statistic-picker";
import "../../../../components/ha-alert";
import "../../../../components/input/ha-input";
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
import {
  apiContext,
  entitiesContext,
  formattersContext,
  statesContext,
} from "../../../../data/context";
import { DirtyStateProviderMixin } from "../../../../mixins/dirty-state-provider-mixin";
import type {
  HomeAssistantApi,
  HomeAssistantFormatters,
  ValueChangedEvent,
} from "../../../../types";
import type { IntegralUnits } from "../dialogs/energy-integral";
import { confirmIntegrals, integralUnits } from "../dialogs/energy-integral";
import "../dialogs/ha-energy-upstream-device-picker";
import type {
  EnergyDeviceEditorParams,
  EnergyEditorStatus,
} from "./energy-editor";
import { EnergyEditorMixin, energyEditorStyles } from "./energy-editor";

const energyUnitClasses = ["energy"];
const powerUnitClasses = ["power"];

// Without an energy sensor, saving offers to create one from the power sensor
type DeviceConsumptionDraft = Partial<DeviceConsumptionEnergyPreference>;

@customElement("ha-energy-device-editor")
export class HaEnergyDeviceEditor extends EnergyEditorMixin(
  DirtyStateProviderMixin<DeviceConsumptionDraft | null>()(LitElement)
) {
  @property({ attribute: false }) public params!: EnergyDeviceEditorParams;

  @state() @consumeLocalize() private _localize!: LocalizeFunc;

  @state()
  @consume({ context: formattersContext, subscribe: true })
  @transform<
    HomeAssistantFormatters,
    HomeAssistantFormatters["formatEntityName"]
  >({
    transformer: ({ formatEntityName }) => formatEntityName,
  })
  private _formatEntityName!: HomeAssistantFormatters["formatEntityName"];

  @consume({ context: apiContext, subscribe: true })
  private _api!: HomeAssistantApi;

  // Kept current without rendering on every state change
  @consume({ context: statesContext, subscribe: true })
  private _states!: ContextType<typeof statesContext>;

  @consume({ context: entitiesContext, subscribe: true })
  private _entities!: ContextType<typeof entitiesContext>;

  @state()
  @consume({ context: statesContext, subscribe: true })
  @transform<ContextType<typeof statesContext>, string>({
    transformer: function (this: HaEnergyDeviceEditor, states) {
      const statRate = this._device?.stat_rate;
      return statRate
        ? states?.[statRate]?.attributes.unit_of_measurement
        : undefined;
    },
    watch: ["_device"],
  })
  private _rateUnit?: string;

  @state() private _device?: DeviceConsumptionDraft;

  @state() private _energy_units?: string[];

  @state() private _power_units?: string[];

  @state() private _error?: string;

  @state() private _saving = false;

  private _excludeList?: string[];

  private _excludeListPower?: string[];

  private _possibleParents: DeviceConsumptionEnergyPreference[] = [];

  protected willUpdate(changedProps: PropertyValues<this>) {
    super.willUpdate(changedProps);
    if (changedProps.has("params")) {
      this._init();
    }
  }

  private _init() {
    const params = this.params;
    this._device = params.device;
    this._error = undefined;
    this._saving = false;
    this._computePossibleParents();
    this._excludeList = params.device_consumptions
      .map((entry) => entry.stat_consumption)
      .filter((id) => id !== this._device?.stat_consumption);
    this._excludeListPower = params.device_consumptions
      .map((entry) => entry.stat_rate)
      .filter((id) => id && id !== this._device?.stat_rate) as string[];
    this._initDirtyTracking({ type: "deep" }, this._device ?? null);
    this._loadUnits();
  }

  private async _loadUnits() {
    const [energy, power] = await Promise.all([
      getSensorDeviceClassConvertibleUnits(this._api.callWS, "energy"),
      getSensorDeviceClassConvertibleUnits(this._api.callWS, "power"),
    ]);
    this._energy_units = energy.units;
    this._power_units = power.units;
  }

  private _computePossibleParents() {
    if (!this._device) {
      this._possibleParents = [];
      return;
    }
    const children: string[] = [];
    const devices = this.params.device_consumptions;
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
      this._device.stat_consumption ?? this.params.device?.stat_consumption;
    if (stat) {
      getChildren(stat);
    }
    this._possibleParents = this.params.device_consumptions.filter(
      (d) =>
        d.stat_consumption !== this._device!.stat_consumption &&
        d.stat_consumption !== this.params.device?.stat_consumption &&
        !children.includes(d.stat_consumption)
    );
  }

  protected get editorStatus(): EnergyEditorStatus {
    return {
      dirty: this.isDirtyState,
      valid: !!(this._device?.stat_consumption || this._integralUnits()),
      saving: this._saving,
    };
  }

  protected render() {
    const labelStatistic =
      this._device?.stat_consumption ?? this._device?.stat_rate;

    return html`
      ${
        this._error
          ? html`<ha-alert alert-type="error">${this._error}</ha-alert>`
          : nothing
      }
      <div class="group">
        <ha-statistic-picker
          .helpMissingEntityUrl=${energyStatisticHelpUrl}
          .includeUnitClass=${energyUnitClasses}
          .value=${this._device?.stat_consumption}
          .label=${this._localize(
            "ui.panel.config.energy.device_consumption.dialog.device_consumption_energy"
          )}
          .excludeStatistics=${this._excludeList}
          @value-changed=${this._statisticChanged}
          .disabled=${this._saving}
          .helper=${this._localize(
            "ui.panel.config.energy.device_consumption.dialog.selected_stat_intro",
            { unit: this._energy_units?.join(", ") || "" }
          )}
        ></ha-statistic-picker>
        <ha-input
          .label=${this._localize(
            "ui.panel.config.energy.device_consumption.dialog.display_name"
          )}
          .disabled=${!this._device || this._saving}
          .value=${this._device?.name || ""}
          .placeholder=${
            labelStatistic
              ? computeEnergyLabel(
                  this._states,
                  this._formatEntityName,
                  labelStatistic,
                  this.params.statsMetadata?.[labelStatistic]
                )
              : ""
          }
          @input=${this._nameChanged}
        >
        </ha-input>
      </div>

      <wa-divider></wa-divider>

      <ha-statistic-picker
        .includeUnitClass=${powerUnitClasses}
        .value=${this._device?.stat_rate}
        .label=${this._localize(
          "ui.panel.config.energy.device_consumption.dialog.device_consumption_power"
        )}
        .excludeStatistics=${this._excludeListPower}
        @value-changed=${this._powerStatisticChanged}
        .disabled=${this._saving}
        .helper=${this._localize(
          "ui.panel.config.energy.device_consumption.dialog.selected_stat_intro",
          { unit: this._power_units?.join(", ") || "" }
        )}
      ></ha-statistic-picker>

      <wa-divider></wa-divider>

      <ha-energy-upstream-device-picker
        .label=${this._localize(
          "ui.panel.config.energy.device_consumption.dialog.included_in_device"
        )}
        .helper=${this._localize(
          "ui.panel.config.energy.device_consumption.dialog.included_in_device_helper"
        )}
        .value=${this._device?.included_in_stat}
        .possibleParents=${this._possibleParents}
        .statsMetadata=${this.params.statsMetadata}
        .emptyLabel=${this._localize(
          "ui.panel.config.energy.device_consumption.dialog.no_upstream_devices"
        )}
        .disabled=${!this._device || this._saving}
        @value-changed=${this._parentChanged}
      ></ha-energy-upstream-device-picker>
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
      this.params.statsMetadata &&
      !(ev.detail.value in this.params.statsMetadata)
    ) {
      const [metadata] = await getStatisticMetadata(this._api.callWS, [
        ev.detail.value,
      ]);
      if (metadata) {
        this.params.statsMetadata[ev.detail.value] = metadata;
        this.requestUpdate();
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
    return integralUnits(this._rateUnit, this._energy_units);
  }

  public async save(): Promise<boolean> {
    // The editor can be replaced while saving, but a created helper must still
    // be saved with the submitted device
    const params = this.params;
    const draft = this._device!;
    const isCurrent = () => this.params === params && this.isConnected;
    this._error = undefined;
    this._saving = true;
    try {
      const statConsumption =
        draft.stat_consumption ?? (await this._energyFromPower(draft));
      if (!statConsumption) {
        return false;
      }
      const device = { ...draft, stat_consumption: statConsumption };
      if (isCurrent()) {
        this._device = device;
        this._updateDirtyState(device);
      }
      await params.saveCallback(device);
      if (isCurrent()) {
        this._markDirtyStateClean();
      }
      return true;
    } catch (err: any) {
      if (isCurrent()) {
        this._error = err.message;
      }
      return false;
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
    const sensors = await confirmIntegrals(this, {
      api: this._api,
      localize: this._localize,
      formatEntityName: this._formatEntityName,
      deviceClass: "energy",
      states: this._states,
      entities: this._entities,
      requests: [
        {
          rate: statRate,
          units,
          name: this._localize(
            "ui.panel.config.energy.integral.energy.sensor_name",
            {
              name: computeEnergyLabel(
                this._states,
                this._formatEntityName,
                statRate,
                this.params.statsMetadata?.[statRate],
                draft.name
              ),
            }
          ),
        },
      ],
      intro: this._localize(
        "ui.panel.config.energy.device_consumption.dialog.energy_sensor_needed"
      ),
      exclude: this._excludeList,
      statsMetadata: this.params.statsMetadata,
    });
    return sensors?.[0];
  }

  static get styles(): CSSResultGroup {
    return energyEditorStyles;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-energy-device-editor": HaEnergyDeviceEditor;
  }
}
