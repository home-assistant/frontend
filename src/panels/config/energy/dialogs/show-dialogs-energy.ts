import { fireEvent } from "../../../../common/dom/fire_event";
import type {
  BatterySourceTypeEnergyPreference,
  DeviceConsumptionEnergyPreference,
  EnergyGasUnitClass,
  EnergyInfo,
  GasSourceTypeEnergyPreference,
  GridSourceTypeEnergyPreference,
  SolarSourceTypeEnergyPreference,
  WaterSourceTypeEnergyPreference,
} from "../../../../data/energy";
import type { StatisticsMetaData } from "../../../../data/recorder";

export interface EnergySettingsGridDialogParams {
  source?: GridSourceTypeEnergyPreference;
  grid_sources: GridSourceTypeEnergyPreference[];
  saveCallback: (source: GridSourceTypeEnergyPreference) => Promise<void>;
}

export interface EnergySettingsSolarDialogParams {
  info: EnergyInfo;
  source?: SolarSourceTypeEnergyPreference;
  solar_sources: SolarSourceTypeEnergyPreference[];
  saveCallback: (source: SolarSourceTypeEnergyPreference) => Promise<void>;
}

export interface EnergySettingsBatteryDialogParams {
  source?: BatterySourceTypeEnergyPreference;
  battery_sources: BatterySourceTypeEnergyPreference[];
  saveCallback: (source: BatterySourceTypeEnergyPreference) => Promise<void>;
}

export interface EnergySettingsGasDialogParams {
  source?: GasSourceTypeEnergyPreference;
  allowedGasUnitClass?: EnergyGasUnitClass;
  metadata?: StatisticsMetaData;
  gas_sources: GasSourceTypeEnergyPreference[];
  saveCallback: (source: GasSourceTypeEnergyPreference) => Promise<void>;
}

export interface EnergySettingsWaterDialogParams {
  source?: WaterSourceTypeEnergyPreference;
  metadata?: StatisticsMetaData;
  water_sources: WaterSourceTypeEnergyPreference[];
  saveCallback: (source: WaterSourceTypeEnergyPreference) => Promise<void>;
}

export interface EnergySettingsDeviceDialogParams {
  device?: DeviceConsumptionEnergyPreference;
  device_consumptions: DeviceConsumptionEnergyPreference[];
  statsMetadata?: Record<string, StatisticsMetaData>;
  saveCallback: (device: DeviceConsumptionEnergyPreference) => Promise<void>;
}

export interface EnergySettingsDeviceWaterDialogParams {
  device?: DeviceConsumptionEnergyPreference;
  device_consumptions: DeviceConsumptionEnergyPreference[];
  statsMetadata?: Record<string, StatisticsMetaData>;
  saveCallback: (device: DeviceConsumptionEnergyPreference) => Promise<void>;
}

export const showEnergySettingsDeviceDialog = (
  element: HTMLElement,
  dialogParams: EnergySettingsDeviceDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-energy-device-settings",
    dialogImport: () => import("./dialog-energy-device-settings"),
    dialogParams: dialogParams,
  });
};

export const showEnergySettingsBatteryDialog = (
  element: HTMLElement,
  dialogParams: EnergySettingsBatteryDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-energy-battery-settings",
    dialogImport: () => import("./dialog-energy-battery-settings"),
    dialogParams: dialogParams,
  });
};

export const showEnergySettingsSolarDialog = (
  element: HTMLElement,
  dialogParams: EnergySettingsSolarDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-energy-solar-settings",
    dialogImport: () => import("./dialog-energy-solar-settings"),
    dialogParams: dialogParams,
  });
};

export const showEnergySettingsGasDialog = (
  element: HTMLElement,
  dialogParams: EnergySettingsGasDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-energy-gas-settings",
    dialogImport: () => import("./dialog-energy-gas-settings"),
    dialogParams: dialogParams,
  });
};

export const showEnergySettingsWaterDialog = (
  element: HTMLElement,
  dialogParams: EnergySettingsWaterDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-energy-water-settings",
    dialogImport: () => import("./dialog-energy-water-settings"),
    dialogParams: dialogParams,
  });
};

export const showEnergySettingsDeviceWaterDialog = (
  element: HTMLElement,
  dialogParams: EnergySettingsDeviceWaterDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-energy-device-settings-water",
    dialogImport: () => import("./dialog-energy-device-settings-water"),
    dialogParams: dialogParams,
  });
};

export const showEnergySettingsGridDialog = (
  element: HTMLElement,
  dialogParams: EnergySettingsGridDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-energy-grid-settings",
    dialogImport: () => import("./dialog-energy-grid-settings"),
    dialogParams: dialogParams,
  });
};
