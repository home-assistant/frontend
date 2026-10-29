import type { LitElement, PropertyValues } from "lit";
import { css } from "lit";
import { fireEvent } from "../../../../common/dom/fire_event";
import { shallowEqual } from "../../../../common/util/shallow-equal";
import type {
  BatterySourceTypeEnergyPreference,
  DeviceConsumptionEnergyPreference,
  EnergyGasUnitClass,
  EnergyInfo,
  GasSourceTypeEnergyPreference,
  GridSourceTypeEnergyPreference,
  HomeSourceTypeEnergyPreference,
  SolarSourceTypeEnergyPreference,
  WaterSourceTypeEnergyPreference,
} from "../../../../data/energy";
import type { StatisticsMetaData } from "../../../../data/recorder";
import type { Constructor } from "../../../../types";

export interface EnergyGridSourceEditorParams {
  source?: GridSourceTypeEnergyPreference;
  grid_sources: GridSourceTypeEnergyPreference[];
  statsMetadata?: Record<string, StatisticsMetaData>;
  saveCallback: (source: GridSourceTypeEnergyPreference) => Promise<void>;
}

export interface EnergySolarSourceEditorParams {
  info: EnergyInfo;
  source?: SolarSourceTypeEnergyPreference;
  solar_sources: SolarSourceTypeEnergyPreference[];
  statsMetadata?: Record<string, StatisticsMetaData>;
  saveCallback: (source: SolarSourceTypeEnergyPreference) => Promise<void>;
}

export interface EnergyHomeSourceEditorParams {
  source?: HomeSourceTypeEnergyPreference;
  saveCallback: (source: HomeSourceTypeEnergyPreference) => Promise<void>;
}

export interface EnergyBatterySourceEditorParams {
  source?: BatterySourceTypeEnergyPreference;
  battery_sources: BatterySourceTypeEnergyPreference[];
  statsMetadata?: Record<string, StatisticsMetaData>;
  saveCallback: (source: BatterySourceTypeEnergyPreference) => Promise<void>;
}

export interface EnergyGasSourceEditorParams {
  source?: GasSourceTypeEnergyPreference;
  allowedGasUnitClass?: EnergyGasUnitClass;
  gas_sources: GasSourceTypeEnergyPreference[];
  statsMetadata?: Record<string, StatisticsMetaData>;
  saveCallback: (source: GasSourceTypeEnergyPreference) => Promise<void>;
}

export interface EnergyWaterSourceEditorParams {
  source?: WaterSourceTypeEnergyPreference;
  water_sources: WaterSourceTypeEnergyPreference[];
  statsMetadata?: Record<string, StatisticsMetaData>;
  saveCallback: (source: WaterSourceTypeEnergyPreference) => Promise<void>;
}

/** For both electricity and water devices */
export interface EnergyDeviceEditorParams {
  device?: DeviceConsumptionEnergyPreference;
  device_consumptions: DeviceConsumptionEnergyPreference[];
  statsMetadata?: Record<string, StatisticsMetaData>;
  saveCallback: (device: DeviceConsumptionEnergyPreference) => Promise<void>;
}

export type EnergyEditorConfig =
  | { kind: "grid"; params: EnergyGridSourceEditorParams }
  | { kind: "solar"; params: EnergySolarSourceEditorParams }
  | { kind: "home"; params: EnergyHomeSourceEditorParams }
  | { kind: "battery"; params: EnergyBatterySourceEditorParams }
  | { kind: "device"; params: EnergyDeviceEditorParams }
  | { kind: "gas"; params: EnergyGasSourceEditorParams }
  | { kind: "water"; params: EnergyWaterSourceEditorParams }
  | { kind: "water_device"; params: EnergyDeviceEditorParams };

export interface EnergyEditorStatus {
  /** Whether there are changes to save */
  dirty: boolean;
  /** Whether the changes can be saved */
  valid: boolean;
  saving: boolean;
}

export interface EnergyEditorElement extends HTMLElement {
  save(): Promise<boolean>;
}

declare global {
  interface HASSDomEvents {
    "energy-editor-status-changed": EnergyEditorStatus;
  }
}

/**
 * Lets the dialog or page hosting an energy editor render its save button.
 */
export const EnergyEditorMixin = <T extends Constructor<LitElement>>(
  superClass: T
) =>
  class extends superClass {
    private _reportedStatus?: EnergyEditorStatus;

    protected get editorStatus(): EnergyEditorStatus {
      throw new Error("Not implemented");
    }

    public save(): Promise<boolean> {
      throw new Error("Not implemented");
    }

    protected updated(changedProps: PropertyValues) {
      super.updated(changedProps);
      const status = this.editorStatus;
      if (
        !this._reportedStatus ||
        !shallowEqual(status, this._reportedStatus)
      ) {
        this._reportedStatus = status;
        fireEvent(this, "energy-editor-status-changed", status);
      }
    }
  };

export const energyEditorStyles = css`
  :host {
    display: flex;
    flex-direction: column;
    gap: var(--ha-space-4);
  }
  ha-alert,
  ha-statistic-picker,
  ha-entity-picker,
  ha-select,
  ha-input {
    display: block;
  }
  ha-input {
    --ha-input-padding-bottom: 0;
  }
  wa-divider {
    --spacing: 0;
  }
  .group {
    display: flex;
    flex-direction: column;
    gap: var(--ha-space-4);
  }
  .group-header {
    display: flex;
    flex-direction: column;
    gap: var(--ha-space-1);
  }
  .group-header h3 {
    margin: 0;
    font-size: var(--ha-font-size-l);
    font-weight: var(--ha-font-weight-medium);
    line-height: var(--ha-line-height-condensed);
  }
  .group-header p {
    margin: 0;
    color: var(--secondary-text-color);
  }
`;
