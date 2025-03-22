import type { QRProvisioningInformation } from "../../../../../../data/zwave_js";

export const backButtonStages: Partial<ZWaveJSAddNodeStage>[] = [
  "qr_scan",
  "select_other_method",
  "qr_code_input",
  "choose_security_strategy",
  "configure_device",
];

export const closeButtonStages: Partial<ZWaveJSAddNodeStage>[] = [
  "select_method",
  "search_devices",
  "search_smart_start_device",
  "search_s2_device",
  "failed",
  "interviewing",
  "validate_dsk_enter_pin",
];

export type ZWaveJSAddNodeStage =
  | "loading"
  | "qr_scan"
  | "select_method"
  | "select_other_method"
  | "qr_code_input"
  | "search_devices"
  | "search_smart_start_device"
  | "search_s2_device"
  | "choose_security_strategy"
  | "configure_device"
  | "interviewing"
  | "failed"
  | "timed_out"
  | "finished"
  | "validate_dsk_enter_pin"
  | "grant_security_classes"
  | "waiting_for_device";

export interface ZWaveJSAddNodeSmartStartOptions {
  name: string;
  area?: string;
  network_type?: "long-range" | "mesh";
}

export interface ZWaveJSAddNodeDevice {
  id?: string;
  name: string;
  provisioningInfo?: QRProvisioningInformation;
}
