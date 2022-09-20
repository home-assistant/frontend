import { fireEvent } from "../../../../common/dom/fire_event";
import {
  BatterySourceTypeEnergyPreference,
  DeviceConsumptionEnergyPreference,
  EnergyGasUnit,
  EnergyInfo,
  FlowFromGridSourceEnergyPreference,
  FlowToGridSourceEnergyPreference,
  GasSourceTypeEnergyPreference,
  SolarSourceTypeEnergyPreference,
} from "../../../../data/energy";
import { StatisticsMetaData } from "../../../../data/recorder";

export interface EnergySettingsGridFlowDialogParams {
  source?:
    | FlowFromGridSourceEnergyPreference
    | FlowToGridSourceEnergyPreference;
  direction: "from" | "to";
  saveCallback: (
    source:
      | FlowFromGridSourceEnergyPreference
      | FlowToGridSourceEnergyPreference
  ) => Promise<void>;
}

export interface EnergySettingsGridFlowFromDialogParams {
  source?: FlowFromGridSourceEnergyPreference;
  saveCallback: (source: FlowFromGridSourceEnergyPreference) => Promise<void>;
}

export interface EnergySettingsGridFlowToDialogParams {
  source?: FlowToGridSourceEnergyPreference;
  saveCallback: (source: FlowToGridSourceEnergyPreference) => Promise<void>;
}

export interface EnergySettingsSolarDialogParams {
  info: EnergyInfo;
  source?: SolarSourceTypeEnergyPreference;
  saveCallback: (source: SolarSourceTypeEnergyPreference) => Promise<void>;
}

export interface EnergySettingsBatteryDialogParams {
  source?: BatterySourceTypeEnergyPreference;
  saveCallback: (source: BatterySourceTypeEnergyPreference) => Promise<void>;
}

export interface EnergySettingsGasDialogParams {
  source?: GasSourceTypeEnergyPreference;
  allowedGasUnitCategory?: EnergyGasUnit;
  metadata?: StatisticsMetaData;
  saveCallback: (source: GasSourceTypeEnergyPreference) => Promise<void>;
}

export interface EnergySettingsDeviceDialogParams {
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

export const showEnergySettingsGridFlowFromDialog = (
  element: HTMLElement,
  dialogParams: EnergySettingsGridFlowFromDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-energy-grid-flow-settings",
    dialogImport: () => import("./dialog-energy-grid-flow-settings"),
    dialogParams: { ...dialogParams, direction: "from" },
  });
};

export const showEnergySettingsGridFlowToDialog = (
  element: HTMLElement,
  dialogParams: EnergySettingsGridFlowToDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-energy-grid-flow-settings",
    dialogImport: () => import("./dialog-energy-grid-flow-settings"),
    dialogParams: { ...dialogParams, direction: "to" },
  });
};
