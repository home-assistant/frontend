import { UnsubscribeFunc } from "home-assistant-js-websocket";
import { HomeAssistant } from "../types";

export enum InclusionState {
  /** The controller isn't doing anything regarding inclusion. */
  Idle,
  /** The controller is waiting for a node to be included. */
  Including,
  /** The controller is waiting for a node to be excluded. */
  Excluding,
  /** The controller is busy including or excluding a node. */
  Busy,
  /** The controller listening for SmartStart nodes to announce themselves. */
  SmartStart,
}

export const enum InclusionStrategy {
  /**
   * Always uses Security S2 if supported, otherwise uses Security S0 for certain devices which don't work without encryption and uses no encryption otherwise.
   *
   * Issues a warning if Security S0 or S2 is supported, but the secure bootstrapping fails.
   *
   * **This is the recommended** strategy and should be used unless there is a good reason not to.
   */
  Default = 0,
  /**
   * Include using SmartStart (requires Security S2).
   * Issues a warning if Security S2 is not supported, or the secure bootstrapping fails.
   *
   * **Should be preferred** over **Default** if supported.
   */
  SmartStart,

  /**
   * Don't use encryption, even if supported.
   *
   * **Not recommended**, because S2 should be used where possible.
   */
  Insecure,
  /**
   * Use Security S0, even if a higher security mode is supported.
   *
   * Issues a warning if Security S0 is not supported or the secure bootstrapping fails.
   *
   * **Not recommended** because S0 should be used sparingly and S2 preferred whereever possible.
   */
  Security_S0,
  /**
   * Use Security S2 and issue a warning if it is not supported or the secure bootstrapping fails.
   *
   * **Not recommended** because the *Default* strategy is more versatile and user-friendly.
   */
  Security_S2,
}

export enum SecurityClass {
  /**
   * Used internally during inclusion of a node. Don't use this!
   */
  Temporary = -2,
  /**
   * `None` is used to indicate that a node is included without security.
   * It is not meant as input to methods that accept a security class.
   */
  None = -1,
  S2_Unauthenticated = 0,
  S2_Authenticated = 1,
  S2_AccessControl = 2,
  S0_Legacy = 7,
}

/** A named list of Z-Wave features */
export enum ZWaveFeature {
  // Available starting with Z-Wave SDK 6.81
  SmartStart,
}

enum QRCodeVersion {
  S2 = 0,
  SmartStart = 1,
}

enum Protocols {
  ZWave = 0,
  ZWaveLongRange = 1,
}

enum NodeType {
  Controller,
  /** @deprecated Use `NodeType["End Node"]` instead */
  "Routing End Node",
  "End Node" = 1,
}

enum RFRegion {
  "Europe" = 0x00,
  "USA" = 0x01,
  "Australia/New Zealand" = 0x02,
  "Hong Kong" = 0x03,
  "India" = 0x05,
  "Israel" = 0x06,
  "Russia" = 0x07,
  "China" = 0x08,
  "USA (Long Range)" = 0x09,
  "Japan" = 0x20,
  "Korea" = 0x21,
  "Unknown" = 0xfe,
  "Default (EU)" = 0xff,
}

export enum NodeFirmwareUpdateStatus {
  Error_Timeout = -1,
  Error_Checksum = 0,
  Error_TransmissionFailed = 1,
  Error_InvalidManufacturerID = 2,
  Error_InvalidFirmwareID = 3,
  Error_InvalidFirmwareTarget = 4,
  Error_InvalidHeaderInformation = 5,
  Error_InvalidHeaderFormat = 6,
  Error_InsufficientMemory = 7,
  Error_InvalidHardwareVersion = 8,
  OK_WaitingForActivation = 0xfd,
  OK_NoRestart = 0xfe,
  OK_RestartPending = 0xff,
}

export enum ControllerFirmwareUpdateStatus {
  // An expected response was not received from the controller in time
  Error_Timeout = 0,
  /** The maximum number of retry attempts for a firmware fragments were reached */
  Error_RetryLimitReached,
  /** The update was aborted by the bootloader */
  Error_Aborted,
  /** This controller does not support firmware updates */
  Error_NotSupported,

  OK = 0xff,
}

export interface QRProvisioningInformation {
  version: QRCodeVersion;
  securityClasses: SecurityClass[];
  dsk: string;
  genericDeviceClass: number;
  specificDeviceClass: number;
  installerIconType: number;
  manufacturerId: number;
  productType: number;
  productId: number;
  applicationVersion: string;
  maxInclusionRequestInterval?: number | undefined;
  uuid?: string | undefined;
  supportedProtocols?: Protocols[] | undefined;
}

export interface PlannedProvisioningEntry {
  /** The device specific key (DSK) in the form aaaaa-bbbbb-ccccc-ddddd-eeeee-fffff-11111-22222 */
  dsk: string;
  security_classes: SecurityClass[];
}

export const MINIMUM_QR_STRING_LENGTH = 52;

export interface ZWaveJSNetwork {
  client: ZWaveJSClient;
  controller: ZWaveJSController;
}

export interface ZWaveJSClient {
  state: "connected" | "disconnected";
  ws_server_url: string;
  server_version: string;
  driver_version: string;
}

export interface ZWaveJSController {
  home_id: number;
  sdk_version: string;
  type: number;
  own_node_id: number;
  rf_region: RFRegion | null;
  is_primary: boolean;
  is_using_home_id_from_other_network: boolean;
  is_sis_present: boolean;
  was_real_primary: boolean;
  is_suc: boolean;
  node_type: NodeType;
  firmware_version: string;
  manufacturer_id: number;
  product_id: number;
  product_type: number;
  supported_function_types: number[];
  suc_node_id: number;
  supports_timers: boolean;
  is_rebuilding_routes: boolean;
  inclusion_state: InclusionState;
  nodes: ZWaveJSNodeStatus[];
}

export interface ZWaveJSNodeStatus {
  node_id: number;
  ready: boolean;
  status: NodeStatus;
  is_secure: boolean | string;
  is_routing: boolean | null;
  zwave_plus_version: number | null;
  highest_security_class: SecurityClass | null;
  is_controller_node: boolean;
  has_firmware_update_cc: boolean;
}

export interface ZwaveJSNodeMetadata {
  node_id: number;
  exclusion: string;
  inclusion: string;
  manual: string;
  wakeup: string;
  reset: string;
  device_database_url: string;
}

export interface ZwaveJSNodeComments {
  comments: ZWaveJSNodeComment[];
}

export interface ZWaveJSNodeConfigParams {
  [key: string]: ZWaveJSNodeConfigParam;
}

export interface ZWaveJSNodeComment {
  level: "info" | "warning" | "error";
  text: string;
}

export interface ZWaveJSNodeConfigParam {
  property: number;
  property_key: number | null;
  endpoint: number;
  value: any;
  configuration_value_type: string;
  metadata: ZWaveJSNodeConfigParamMetadata;
}

export interface ZWaveJSNodeConfigParamMetadata {
  description: string;
  label: string;
  max: number;
  min: number;
  readable: boolean;
  writeable: boolean;
  type: string;
  unit: string;
  states: { [key: number]: string };
}

export interface ZWaveJSSetConfigParamData {
  type: string;
  device_id: string;
  property: number;
  endpoint: number;
  property_key?: number;
  value: string | number;
}

export interface ZWaveJSSetConfigParamResult {
  value_id?: string;
  status?: string;
  error?: string;
}

export interface ZWaveJSDataCollectionStatus {
  enabled: boolean;
  opted_in: boolean;
}

export interface ZWaveJSRefreshNodeStatusMessage {
  event: string;
  stage?: string;
}

export interface ZWaveJSRebuildRoutesStatusMessage {
  event: string;
  rebuild_routes_status: { [key: number]: string };
}

export interface ZWaveJSControllerStatisticsUpdatedMessage {
  event: "statistics updated";
  source: "controller";
  messages_tx: number;
  messages_rx: number;
  messages_dropped_tx: number;
  messages_dropped_rx: number;
  nak: number;
  can: number;
  timeout_ack: number;
  timeout_response: number;
  timeout_callback: number;
}

export enum RssiError {
  NotAvailable = 127,
  ReceiverSaturated = 126,
  NoSignalDetected = 125,
}

export enum ProtocolDataRate {
  ZWave_9k6 = 0x01,
  ZWave_40k = 0x02,
  ZWave_100k = 0x03,
  LongRange_100k = 0x04,
}

export interface ZWaveJSNodeStatisticsUpdatedMessage {
  event: "statistics updated";
  source: "node";
  commands_tx: number;
  commands_rx: number;
  commands_dropped_tx: number;
  commands_dropped_rx: number;
  timeout_response: number;
  rtt: number | null;
  rssi: RssiError | number | null;
  lwr: ZWaveJSRouteStatistics | null;
  nlwr: ZWaveJSRouteStatistics | null;
}

export interface ZWaveJSRouteStatistics {
  protocol_data_rate: number;
  repeaters: string[];
  rssi: RssiError | number | null;
  repeater_rssi: (RssiError | number)[];
  route_failed_between: [string, string] | null;
}

export interface ZWaveJSNodeStatusUpdatedMessage {
  event: "ready" | "wake up" | "sleep" | "dead" | "alive";
  ready: boolean;
  status: NodeStatus;
}

export interface ZWaveJSFirmwareUpdateProgressMessage {
  event: "firmware update progress";
  current_file: number;
  total_files: number;
  sent_fragments: number;
  total_fragments: number;
  progress: number;
}

export interface ZWaveJSNodeFirmwareUpdateFinishedMessage {
  event: "firmware update finished";
  status: NodeFirmwareUpdateStatus;
  success: boolean;
  wait_time?: number;
  reinterview: boolean;
}

export interface ZWaveJSControllerFirmwareUpdateFinishedMessage {
  event: "firmware update finished";
  status: ControllerFirmwareUpdateStatus;
  success: boolean;
}

export type ZWaveJSNodeFirmwareUpdateCapabilities =
  | { firmware_upgradable: false }
  | {
      firmware_upgradable: true;
      firmware_targets: number[];
      continues_to_function: boolean | null;
      supports_activation: boolean | null;
    };

export interface ZWaveJSRemovedNode {
  node_id: number;
  manufacturer: string;
  label: string;
}

export const enum NodeStatus {
  Unknown,
  Asleep,
  Awake,
  Dead,
  Alive,
}

export interface ZwaveJSProvisioningEntry {
  /** The device specific key (DSK) in the form aaaaa-bbbbb-ccccc-ddddd-eeeee-fffff-11111-22222 */
  dsk: string;
  security_classes: SecurityClass[];
  additional_properties: {
    nodeId?: number;
    [prop: string]: any;
  };
}

export interface RequestedGrant {
  /**
   * An array of security classes that are requested or to be granted.
   * The granted security classes MUST be a subset of the requested ones.
   */
  securityClasses: SecurityClass[];
  /** Whether client side authentication is requested or to be granted */
  clientSideAuth: boolean;
}

export const fetchZwaveNetworkStatus = (
  hass: HomeAssistant,
  device_or_entry_id: {
    device_id?: string;
    entry_id?: string;
  }
): Promise<ZWaveJSNetwork> => {
  if (device_or_entry_id.device_id && device_or_entry_id.entry_id) {
    throw new Error("Only one of device or entry ID should be supplied.");
  }
  if (!device_or_entry_id.device_id && !device_or_entry_id.entry_id) {
    throw new Error("Either device or entry ID should be supplied.");
  }
  return hass.callWS({
    type: "zwave_js/network_status",
    device_id: device_or_entry_id.device_id,
    entry_id: device_or_entry_id.entry_id,
  });
};

export const fetchZwaveDataCollectionStatus = (
  hass: HomeAssistant,
  entry_id: string
): Promise<ZWaveJSDataCollectionStatus> =>
  hass.callWS({
    type: "zwave_js/data_collection_status",
    entry_id,
  });

export const setZwaveDataCollectionPreference = (
  hass: HomeAssistant,
  entry_id: string,
  opted_in: boolean
): Promise<any> =>
  hass.callWS({
    type: "zwave_js/update_data_collection_preference",
    entry_id,
    opted_in,
  });

export const fetchZwaveProvisioningEntries = (
  hass: HomeAssistant,
  entry_id: string
): Promise<ZwaveJSProvisioningEntry[]> =>
  hass.callWS({
    type: "zwave_js/get_provisioning_entries",
    entry_id,
  });

export const subscribeAddZwaveNode = (
  hass: HomeAssistant,
  entry_id: string,
  callbackFunction: (message: any) => void,
  inclusion_strategy: InclusionStrategy = InclusionStrategy.Default,
  qr_provisioning_information?: QRProvisioningInformation,
  qr_code_string?: string,
  planned_provisioning_entry?: PlannedProvisioningEntry,
  dsk?: string
): Promise<UnsubscribeFunc> =>
  hass.connection.subscribeMessage((message) => callbackFunction(message), {
    type: "zwave_js/add_node",
    entry_id: entry_id,
    inclusion_strategy,
    qr_code_string,
    qr_provisioning_information,
    planned_provisioning_entry,
    dsk,
  });

export const stopZwaveInclusion = (hass: HomeAssistant, entry_id: string) =>
  hass.callWS({
    type: "zwave_js/stop_inclusion",
    entry_id,
  });

export const stopZwaveExclusion = (hass: HomeAssistant, entry_id: string) =>
  hass.callWS({
    type: "zwave_js/stop_exclusion",
    entry_id,
  });

export const zwaveGrantSecurityClasses = (
  hass: HomeAssistant,
  entry_id: string,
  security_classes: SecurityClass[],
  client_side_auth?: boolean
) =>
  hass.callWS({
    type: "zwave_js/grant_security_classes",
    entry_id,
    security_classes,
    client_side_auth,
  });

export const zwaveTryParseDskFromQrCode = (
  hass: HomeAssistant,
  entry_id: string,
  qr_code_string: string
) =>
  hass.callWS<string | null>({
    type: "zwave_js/try_parse_dsk_from_qr_code_string",
    entry_id,
    qr_code_string,
  });

export const zwaveValidateDskAndEnterPin = (
  hass: HomeAssistant,
  entry_id: string,
  pin: string
) =>
  hass.callWS({
    type: "zwave_js/validate_dsk_and_enter_pin",
    entry_id,
    pin,
  });

export const zwaveSupportsFeature = (
  hass: HomeAssistant,
  entry_id: string,
  feature: ZWaveFeature
): Promise<{ supported: boolean }> =>
  hass.callWS({
    type: "zwave_js/supports_feature",
    entry_id,
    feature,
  });

export const zwaveParseQrCode = (
  hass: HomeAssistant,
  entry_id: string,
  qr_code_string: string
): Promise<QRProvisioningInformation> =>
  hass.callWS({
    type: "zwave_js/parse_qr_code_string",
    entry_id,
    qr_code_string,
  });

export const provisionZwaveSmartStartNode = (
  hass: HomeAssistant,
  entry_id: string,
  qr_provisioning_information?: QRProvisioningInformation,
  qr_code_string?: string,
  planned_provisioning_entry?: PlannedProvisioningEntry
): Promise<QRProvisioningInformation> =>
  hass.callWS({
    type: "zwave_js/provision_smart_start_node",
    entry_id,
    qr_code_string,
    qr_provisioning_information,
    planned_provisioning_entry,
  });

export const unprovisionZwaveSmartStartNode = (
  hass: HomeAssistant,
  entry_id: string,
  dsk?: string,
  node_id?: number
): Promise<QRProvisioningInformation> =>
  hass.callWS({
    type: "zwave_js/unprovision_smart_start_node",
    entry_id,
    dsk,
    node_id,
  });

export const fetchZwaveNodeStatus = (
  hass: HomeAssistant,
  device_id: string
): Promise<ZWaveJSNodeStatus> =>
  hass.callWS({
    type: "zwave_js/node_status",
    device_id,
  });

export const subscribeZwaveNodeStatus = (
  hass: HomeAssistant,
  device_id: string,
  callbackFunction: (message: ZWaveJSNodeStatusUpdatedMessage) => void
): Promise<UnsubscribeFunc> =>
  hass.connection.subscribeMessage(
    (message: any) => callbackFunction(message),
    {
      type: "zwave_js/subscribe_node_status",
      device_id,
    }
  );

export const fetchZwaveNodeMetadata = (
  hass: HomeAssistant,
  device_id: string
): Promise<ZwaveJSNodeMetadata> =>
  hass.callWS({
    type: "zwave_js/node_metadata",
    device_id,
  });

export const fetchZwaveNodeComments = (
  hass: HomeAssistant,
  device_id: string
): Promise<ZwaveJSNodeComments> =>
  hass.callWS({
    type: "zwave_js/node_comments",
    device_id,
  });

export const fetchZwaveNodeConfigParameters = (
  hass: HomeAssistant,
  device_id: string
): Promise<ZWaveJSNodeConfigParams> =>
  hass.callWS({
    type: "zwave_js/get_config_parameters",
    device_id,
  });

export const setZwaveNodeConfigParameter = (
  hass: HomeAssistant,
  device_id: string,
  property: number,
  endpoint: number,
  value: number,
  property_key?: number
): Promise<ZWaveJSSetConfigParamResult> => {
  const data: ZWaveJSSetConfigParamData = {
    type: "zwave_js/set_config_parameter",
    device_id,
    property,
    endpoint,
    value,
    property_key,
  };
  return hass.callWS(data);
};

export const reinterviewZwaveNode = (
  hass: HomeAssistant,
  device_id: string,
  callbackFunction: (message: ZWaveJSRefreshNodeStatusMessage) => void
): Promise<UnsubscribeFunc> =>
  hass.connection.subscribeMessage(
    (message: any) => callbackFunction(message),
    {
      type: "zwave_js/refresh_node_info",
      device_id,
    }
  );

export const rebuildZwaveNodeRoutes = (
  hass: HomeAssistant,
  device_id: string
): Promise<boolean> =>
  hass.callWS({
    type: "zwave_js/rebuild_node_routes",
    device_id,
  });

export const removeFailedZwaveNode = (
  hass: HomeAssistant,
  device_id: string,
  callbackFunction: (message: any) => void
): Promise<UnsubscribeFunc> =>
  hass.connection.subscribeMessage(
    (message: any) => callbackFunction(message),
    {
      type: "zwave_js/remove_failed_node",
      device_id,
    }
  );

export const rebuildZwaveNetworkRoutes = (
  hass: HomeAssistant,
  entry_id: string
): Promise<UnsubscribeFunc> =>
  hass.callWS({
    type: "zwave_js/begin_rebuilding_routes",
    entry_id,
  });

export const stopRebuildingZwaveNetworkRoutes = (
  hass: HomeAssistant,
  entry_id: string
): Promise<UnsubscribeFunc> =>
  hass.callWS({
    type: "zwave_js/stop_rebuilding_routes",
    entry_id,
  });

export const subscribeRebuildZwaveNetworkRoutesProgress = (
  hass: HomeAssistant,
  entry_id: string,
  callbackFunction: (message: ZWaveJSRebuildRoutesStatusMessage) => void
): Promise<UnsubscribeFunc> =>
  hass.connection.subscribeMessage(
    (message: any) => callbackFunction(message),
    {
      type: "zwave_js/subscribe_rebuild_routes_progress",
      entry_id,
    }
  );

export const subscribeZwaveControllerStatistics = (
  hass: HomeAssistant,
  entry_id: string,
  callbackFunction: (message: ZWaveJSControllerStatisticsUpdatedMessage) => void
): Promise<UnsubscribeFunc> =>
  hass.connection.subscribeMessage(
    (message: any) => callbackFunction(message),
    {
      type: "zwave_js/subscribe_controller_statistics",
      entry_id,
    }
  );

export const subscribeZwaveNodeStatistics = (
  hass: HomeAssistant,
  device_id: string,
  callbackFunction: (message: ZWaveJSNodeStatisticsUpdatedMessage) => void
): Promise<UnsubscribeFunc> =>
  hass.connection.subscribeMessage(
    (message: any) => callbackFunction(message),
    {
      type: "zwave_js/subscribe_node_statistics",
      device_id,
    }
  );

export const fetchZwaveIsNodeFirmwareUpdateInProgress = (
  hass: HomeAssistant,
  device_id: string
): Promise<boolean> =>
  hass.callWS({
    type: "zwave_js/is_node_firmware_update_in_progress",
    device_id,
  });

export const fetchZwaveIsAnyOTAFirmwareUpdateInProgress = (
  hass: HomeAssistant,
  entry_id: string
): Promise<boolean> =>
  hass.callWS({
    type: "zwave_js/is_any_ota_firmware_update_in_progress",
    entry_id,
  });

export const fetchZwaveNodeFirmwareUpdateCapabilities = (
  hass: HomeAssistant,
  device_id: string
): Promise<ZWaveJSNodeFirmwareUpdateCapabilities> =>
  hass.callWS({
    type: "zwave_js/get_node_firmware_update_capabilities",
    device_id,
  });

export const hardResetController = (
  hass: HomeAssistant,
  entry_id: string
): Promise<string> =>
  hass.callWS({
    type: "zwave_js/hard_reset_controller",
    entry_id,
  });

export const uploadFirmwareAndBeginUpdate = async (
  hass: HomeAssistant,
  device_id: string,
  file: File,
  target?: number
) => {
  const fd = new FormData();
  fd.append("file", file);
  if (target !== undefined) {
    fd.append("target", target.toString());
  }
  const resp = await hass.fetchWithAuth(
    `/api/zwave_js/firmware/upload/${device_id}`,
    {
      method: "POST",
      body: fd,
    }
  );

  if (resp.status !== 200) {
    throw new Error(resp.statusText);
  }
};

export const subscribeZwaveNodeFirmwareUpdate = (
  hass: HomeAssistant,
  device_id: string,
  callbackFunction: (
    message:
      | ZWaveJSFirmwareUpdateProgressMessage
      | ZWaveJSControllerFirmwareUpdateFinishedMessage
      | ZWaveJSNodeFirmwareUpdateFinishedMessage
  ) => void
): Promise<UnsubscribeFunc> =>
  hass.connection.subscribeMessage(
    (message: any) => callbackFunction(message),
    {
      type: "zwave_js/subscribe_firmware_update_status",
      device_id,
    }
  );

export const abortZwaveNodeFirmwareUpdate = (
  hass: HomeAssistant,
  device_id: string
): Promise<UnsubscribeFunc> =>
  hass.callWS({
    type: "zwave_js/abort_firmware_update",
    device_id,
  });

export type ZWaveJSLogUpdate = ZWaveJSLogMessageUpdate | ZWaveJSLogConfigUpdate;

interface ZWaveJSLogMessageUpdate {
  type: "log_message";
  log_message: ZWaveJSLogMessage;
}

interface ZWaveJSLogConfigUpdate {
  type: "log_config";
  log_config: ZWaveJSLogConfig;
}

export interface ZWaveJSLogMessage {
  timestamp: string;
  level: string;
  primary_tags: string;
  message: string | string[];
}

export const subscribeZWaveJSLogs = (
  hass: HomeAssistant,
  entry_id: string,
  callback: (update: ZWaveJSLogUpdate) => void
) =>
  hass.connection.subscribeMessage<ZWaveJSLogUpdate>(callback, {
    type: "zwave_js/subscribe_log_updates",
    entry_id,
  });

export interface ZWaveJSLogConfig {
  level: string;
  enabled: boolean;
  filename: string;
  log_to_file: boolean;
  force_console: boolean;
}

export const fetchZWaveJSLogConfig = (
  hass: HomeAssistant,
  entry_id: string
): Promise<ZWaveJSLogConfig> =>
  hass.callWS({
    type: "zwave_js/get_log_config",
    entry_id,
  });

export const setZWaveJSLogLevel = (
  hass: HomeAssistant,
  entry_id: string,
  level: string
): Promise<ZWaveJSLogConfig> =>
  hass.callWS({
    type: "zwave_js/update_log_config",
    entry_id,
    config: { level },
  });
