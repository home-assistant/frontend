export const backButtonStages: Partial<ZWaveJSAddNodeStage>[] = [
  "qr_scan",
  "select_other_method",
  "qr_code_input",
];

export const closeButtonStages: Partial<ZWaveJSAddNodeStage>[] = [
  "select_method",
];

export type ZWaveJSAddNodeStage =
  | "loading"
  | "qr_scan"
  | "select_method"
  | "select_other_method"
  | "qr_code_input"
  | "started"
  | "started_specific"
  | "choose_strategy"
  | "interviewing"
  | "failed"
  | "timed_out"
  | "finished"
  | "provisioned"
  | "validate_dsk_enter_pin"
  | "grant_security_classes"
  | "waiting_for_device";
