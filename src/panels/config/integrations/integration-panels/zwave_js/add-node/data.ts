import { MINIMUM_QR_STRING_LENGTH } from "../../../../../../data/zwave_js";

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
  "search_specific_device",
  "failed",
];

export type ZWaveJSAddNodeStage =
  | "loading"
  | "qr_scan"
  | "select_method"
  | "select_other_method"
  | "qr_code_input"
  | "search_devices"
  | "search_specific_device"
  | "choose_security_strategy"
  | "configure_device"
  | "interviewing"
  | "failed"
  | "timed_out"
  | "finished"
  | "provisioned"
  | "validate_dsk_enter_pin"
  | "grant_security_classes"
  | "waiting_for_device";

export interface ZWaveJSAddNodeSmartStartOptions {
  device_name: string;
  network_type?: "long-range" | "mesh";
}

export const validateQrCode = (qrCode: string): boolean =>
  qrCode.length >= MINIMUM_QR_STRING_LENGTH && qrCode.startsWith("90");
