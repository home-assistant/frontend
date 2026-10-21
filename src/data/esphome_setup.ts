import {
  mdiAccessPoint,
  mdiBluetooth,
  mdiMusic,
  mdiSwapHorizontal,
} from "@mdi/js";
import { computeDomain } from "../common/entity/compute_domain";
import { computeObjectId } from "../common/entity/compute_object_id";
import type { LocalizeKeys } from "../common/translations/localize";
import type { DataEntryFlowProgress } from "./data_entry_flow";
import type { ESPHomeDeviceCapabilities, ESPHomeSerialProxy } from "./esphome";
import type { ESPHomeFrontendUserData } from "./frontend";
import type { SerialPortUsage } from "./usb";

export const MUSIC_ASSISTANT_DOCS_URL = "https://music-assistant.io/";

export type ESPHomeCapabilityId =
  "bluetooth" | "audio" | "connectivity" | "serial";

export type ESPHomeCapabilityStatus = "not-started" | "detected" | "completed";

export interface ESPHomeSetupStatus {
  bluetooth?: "not-started" | "completed";
  audio?: "not-started" | "completed";
  connectivity?: "not-started" | "detected" | "completed";
  serial?: "not-started" | "completed";
}

export interface ESPHomeDeviceEntityRef {
  entity_id: string;
  device_id?: string | null;
  platform?: string;
  disabled_by?: string | null;
}

export interface ESPHomeEntityStateRef {
  state: string;
}

export interface ESPHomeAudioControls {
  supported: boolean;
  sendspinEntityId?: string;
  /** True when the Sendspin client switch is on. On means the client is running. */
  sendspinOn: boolean;
}

export const CAPABILITY_ORDER: ESPHomeCapabilityId[] = [
  "bluetooth",
  "audio",
  "connectivity",
  "serial",
];

/** Theme colors for each setup capability. */
export const ESPHOME_CAPABILITY_ACCENTS: Record<ESPHomeCapabilityId, string> = {
  bluetooth: "var(--blue-color)",
  audio: "var(--light-green-color)",
  connectivity: "var(--cyan-color)",
  serial: "var(--deep-purple-color)",
};

export const ESPHOME_CAPABILITY_ICONS: Record<ESPHomeCapabilityId, string> = {
  bluetooth: mdiBluetooth,
  audio: mdiMusic,
  connectivity: mdiAccessPoint,
  serial: mdiSwapHorizontal,
};

export const ESPHOME_CAPABILITY_TITLE_KEYS: Record<
  ESPHomeCapabilityId,
  LocalizeKeys
> = {
  bluetooth: "ui.panel.config.devices.esphome.setup_capability_bluetooth_title",
  audio: "ui.panel.config.devices.esphome.setup_capability_audio_title",
  connectivity:
    "ui.panel.config.devices.esphome.setup_capability_connectivity_title",
  serial: "ui.panel.config.devices.esphome.setup_capability_serial_title",
};

/**
 * Object id of the Sendspin client switch.
 *
 * The platform does not set a default name, translation_key, or device class
 * (https://github.com/esphome/esphome/pull/19361). Home Assistant slugs the
 * YAML name, so this matches `sendspin_enabled` or a device-prefixed
 * `*_sendspin_enabled` only. The published docs and tests use
 * "Sendspin Enabled". A different YAML name, or a renamed entity id, does
 * not match. On starts the client (the restore default); off stops it.
 * Guest mode has no entity yet.
 */
const SENDSPIN_ENABLED_OBJECT_ID = "sendspin_enabled";

/**
 * Object id of the Bluetooth switch, a template switch named "Bluetooth"
 * that runs ble.enable and ble.disable. Device capabilities do not report it.
 */
const BLUETOOTH_OBJECT_ID = "bluetooth";

const findESPHomeSwitch = (
  deviceId: string,
  entities: Iterable<ESPHomeDeviceEntityRef>,
  objectId: string
): string | undefined => {
  for (const entity of entities) {
    // The device page passes full registry entries, including disabled ones
    if (
      entity.device_id !== deviceId ||
      entity.disabled_by ||
      computeDomain(entity.entity_id) !== "switch" ||
      (entity.platform && entity.platform !== "esphome")
    ) {
      continue;
    }
    const entityObjectId = computeObjectId(entity.entity_id);
    if (
      entityObjectId === objectId ||
      entityObjectId.endsWith(`_${objectId}`)
    ) {
      return entity.entity_id;
    }
  }
  return undefined;
};

export const deviceHasMediaPlayerEntity = (
  deviceId: string,
  entities: Iterable<{ entity_id: string; device_id?: string | null }>
): boolean => {
  for (const entity of entities) {
    if (
      entity.device_id === deviceId &&
      computeDomain(entity.entity_id) === "media_player"
    ) {
      return true;
    }
  }
  return false;
};

export const getESPHomeAudioControls = (
  deviceId: string,
  entities: Iterable<ESPHomeDeviceEntityRef>,
  states: Readonly<Record<string, ESPHomeEntityStateRef>> = {}
): ESPHomeAudioControls => {
  const sendspinEntityId = findESPHomeSwitch(
    deviceId,
    entities,
    SENDSPIN_ENABLED_OBJECT_ID
  );

  const sendspinState = sendspinEntityId
    ? states[sendspinEntityId]?.state
    : undefined;

  return {
    supported:
      deviceHasMediaPlayerEntity(deviceId, entities) ||
      Boolean(sendspinEntityId),
    sendspinEntityId,
    sendspinOn: sendspinState === "on",
  };
};

/** Whether the device has an enabled Bluetooth switch, whatever its state. */
export const hasESPHomeBluetoothSwitch = (
  deviceId: string,
  entities: Iterable<ESPHomeDeviceEntityRef>
): boolean =>
  findESPHomeSwitch(deviceId, entities, BLUETOOTH_OBJECT_ID) !== undefined;

/** The device's Bluetooth switch, if it exposes one that can be switched now. */
export const getESPHomeBluetoothSwitch = (
  deviceId: string,
  entities: Iterable<ESPHomeDeviceEntityRef>,
  states: Readonly<Record<string, ESPHomeEntityStateRef>> = {}
): { entityId: string; on: boolean } | undefined => {
  const entityId = findESPHomeSwitch(deviceId, entities, BLUETOOTH_OBJECT_ID);
  // Disabled has no state and unavailable cannot be switched, so neither counts as off
  const state = entityId ? states[entityId]?.state : undefined;
  return entityId && (state === "on" || state === "off")
    ? { entityId, on: state === "on" }
    : undefined;
};

/**
 * Whether the device page should show the setup wizard: the device supports
 * at least one of its parts. Bluetooth only counts with its switch, since
 * without one there is nothing to set up on older Bluetooth proxies. Zigbee
 * has no separate capability bit; the Z-Wave proxy row covers it.
 */
export const hasESPHomeSetupCapabilities = (
  capabilities: ESPHomeDeviceCapabilities | undefined | null,
  options: { mediaPlayerSupported?: boolean; bluetoothSwitch?: boolean } = {}
): boolean =>
  Boolean(
    capabilities &&
    ((capabilities.bluetooth_proxy.supported && options.bluetoothSwitch) ||
      options.mediaPlayerSupported ||
      capabilities.zwave_proxy.supported ||
      capabilities.serial_proxies.length > 0)
  );

export const isESPHomeSerialConfigured = (
  serialProxies: readonly Pick<ESPHomeSerialProxy, "url">[],
  ports: readonly Pick<SerialPortUsage, "device" | "consumers">[]
): boolean =>
  serialProxies.some((proxy) =>
    ports.some((port) => port.device === proxy.url && port.consumers.length > 0)
  );

export const deriveESPHomeSetupStatus = (
  capabilities: ESPHomeDeviceCapabilities,
  options: {
    mediaPlayerSupported: boolean;
    musicAssistantLoaded: boolean;
    /** Undefined when the device has no Bluetooth switch to turn it off. */
    bluetoothEnabled?: boolean;
    sendspinSupported?: boolean;
    sendspinEnabled?: boolean;
    serialConfigured?: boolean;
    zwaveFlowInProgress?: boolean;
  }
): ESPHomeSetupStatus => {
  const status: ESPHomeSetupStatus = {};

  if (capabilities.bluetooth_proxy.supported) {
    status.bluetooth =
      options.bluetoothEnabled === false ? "not-started" : "completed";
  }

  if (options.mediaPlayerSupported || options.sendspinSupported) {
    // ESPHome does not always expose the Sendspin switch. When it is missing,
    // Music Assistant is enough to finish the row.
    status.audio =
      options.musicAssistantLoaded &&
      (!options.sendspinSupported || options.sendspinEnabled)
        ? "completed"
        : "not-started";
  }

  if (capabilities.zwave_proxy.supported) {
    if (capabilities.zwave_proxy.config_entry_id) {
      status.connectivity = "completed";
    } else if (
      capabilities.zwave_proxy.home_id !== 0 ||
      options.zwaveFlowInProgress
    ) {
      status.connectivity = "detected";
    } else {
      status.connectivity = "not-started";
    }
  }

  // Missing usage is not an empty scan: leave serial unset until a boolean result exists.
  if (
    capabilities.serial_proxies.length > 0 &&
    options.serialConfigured !== undefined
  ) {
    status.serial = options.serialConfigured ? "completed" : "not-started";
  }

  return status;
};

// Core stores the device MAC through format_mac; the discovery key keeps the raw value.
const normalizeMac = (mac: string): string =>
  mac.replace(/[^0-9a-f]/gi, "").toLowerCase();

/** The zwave_js discovery flow ESPHome started for this device, keyed by its MAC. */
export const findESPHomeZWaveFlow = (
  flows: readonly DataEntryFlowProgress[],
  macAddress: string | undefined
): DataEntryFlowProgress | undefined => {
  const mac = macAddress ? normalizeMac(macAddress) : undefined;
  if (!mac) {
    return undefined;
  }
  return flows.find((flow) => {
    const discoveryKey = flow.context.discovery_key;
    return (
      flow.handler === "zwave_js" &&
      flow.context.source === "esphome" &&
      discoveryKey?.domain === "esphome" &&
      typeof discoveryKey.key === "string" &&
      normalizeMac(discoveryKey.key) === mac
    );
  });
};

export const getESPHomeSetupCapabilityIds = (
  status: ESPHomeSetupStatus
): ESPHomeCapabilityId[] =>
  CAPABILITY_ORDER.filter((id) => status[id] !== undefined);

export const countRemainingESPHomeCapabilities = (
  status: ESPHomeSetupStatus
): number =>
  getESPHomeSetupCapabilityIds(status).filter(
    (id) => status[id] !== "completed"
  ).length;

export const hasStartedNonBluetoothESPHomeSetup = (
  status: ESPHomeSetupStatus
): boolean =>
  status.audio === "completed" ||
  // A non-zero home id means Core already started Z-Wave discovery.
  status.connectivity === "detected" ||
  status.connectivity === "completed" ||
  status.serial === "completed";

export type ESPHomeSetupBannerState = "setup" | "continue";

/**
 * Headline for the device-page setup banner.
 * The banner is hidden once nothing is left; finished setup uses the reminder.
 */
export const getESPHomeSetupBannerState = (
  status: ESPHomeSetupStatus
): ESPHomeSetupBannerState =>
  hasStartedNonBluetoothESPHomeSetup(status) ? "continue" : "setup";

export const isESPHomeSetupDeferred = (
  data: ESPHomeFrontendUserData | null | undefined,
  deviceId: string
): boolean => Boolean(data?.setupDeferred?.includes(deviceId));

export const withDeferredESPHomeDevice = (
  data: ESPHomeFrontendUserData | null | undefined,
  deviceId: string
): ESPHomeFrontendUserData => ({
  ...data,
  setupDeferred: [...new Set([...(data?.setupDeferred ?? []), deviceId])],
});
