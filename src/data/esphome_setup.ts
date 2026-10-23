import {
  mdiAccessPoint,
  mdiBluetooth,
  mdiMusic,
  mdiSwapHorizontal,
} from "@mdi/js";
import { computeDomain } from "../common/entity/compute_domain";
import type { LocalizeKeys } from "../common/translations/localize";
import type { ConfigEntry } from "./config_entries";
import type { DataEntryFlowProgress } from "./data_entry_flow";
import type {
  ESPHomeDeviceCapabilities,
  ESPHomeDeviceWizard,
  ESPHomeSerialProxy,
} from "./esphome";
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
  /** Undefined when the Sendspin switch cannot be switched now, e.g. while offline. */
  sendspinOn?: boolean;
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

/** Switches the device's wizard lists for parts of this checklist. */
export interface ESPHomeWizardSwitches {
  bluetooth?: string;
  sendspin?: string;
  /** On lets anyone on the network stream without a pairing code. */
  sendspinUnpairedAccess?: string;
}

const wizardPageEntityIds = (
  wizard: ESPHomeDeviceWizard | undefined,
  title: string
): (string | undefined)[] =>
  wizard?.pages
    .find((page) => page.title.trim().toLowerCase() === title)
    ?.entities.map((entity) =>
      entity.entity_id && computeDomain(entity.entity_id) === "switch"
        ? entity.entity_id
        : undefined
    ) ?? [];

/**
 * Find the switches in the device's wizard. Its pages have no ids yet, so they
 * are matched by title. The Sendspin page lists the Sendspin switch first and
 * the unpaired access switch second.
 */
export const getESPHomeWizardSwitches = (
  wizard: ESPHomeDeviceWizard | undefined
): ESPHomeWizardSwitches => {
  const [sendspin, sendspinUnpairedAccess] = wizardPageEntityIds(
    wizard,
    "sendspin"
  );
  return {
    bluetooth: wizardPageEntityIds(wizard, "bluetooth")[0],
    sendspin,
    sendspinUnpairedAccess,
  };
};

// The device page passes full registry entries, including disabled ones
const isEnabledEntity = (
  entityId: string | undefined,
  entities: Iterable<ESPHomeDeviceEntityRef>
): entityId is string => {
  if (!entityId) {
    return false;
  }
  for (const entity of entities) {
    if (entity.entity_id === entityId) {
      return !entity.disabled_by;
    }
  }
  return false;
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

/** A wizard switch, if it can be switched now. */
export const getESPHomeSwitch = (
  entityId: string | undefined,
  states: Readonly<Record<string, ESPHomeEntityStateRef>> = {}
): { entityId: string; on: boolean } | undefined => {
  // Disabled has no state and unavailable cannot be switched, so neither counts as off
  const state = entityId ? states[entityId]?.state : undefined;
  return entityId && (state === "on" || state === "off")
    ? { entityId, on: state === "on" }
    : undefined;
};

export const getESPHomeAudioControls = (
  deviceId: string,
  entities: Iterable<ESPHomeDeviceEntityRef>,
  states: Readonly<Record<string, ESPHomeEntityStateRef>> = {},
  wizardSendspinEntityId?: string
): ESPHomeAudioControls => {
  const sendspinEntityId = isEnabledEntity(wizardSendspinEntityId, entities)
    ? wizardSendspinEntityId
    : undefined;

  return {
    supported:
      deviceHasMediaPlayerEntity(deviceId, entities) ||
      Boolean(sendspinEntityId),
    sendspinEntityId,
    sendspinOn: getESPHomeSwitch(sendspinEntityId, states)?.on,
  };
};

/** Whether the wizard's Bluetooth switch is enabled, whatever its state. */
export const hasESPHomeBluetoothSwitch = (
  wizardBluetoothEntityId: string | undefined,
  entities: Iterable<ESPHomeDeviceEntityRef>
): boolean => isEnabledEntity(wizardBluetoothEntityId, entities);

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

/**
 * Whether Music Assistant is set up. Its integration stays loaded after the
 * entry is deleted, until Home Assistant restarts.
 */
export const isMusicAssistantConfigured = (
  entries: readonly Pick<ConfigEntry, "domain" | "source">[] | undefined
): boolean =>
  Boolean(
    entries?.some(
      (entry) => entry.domain === "music_assistant" && entry.source !== "ignore"
    )
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
    musicAssistantConfigured: boolean;
    /** Undefined when the device has no Bluetooth switch to turn it off. */
    bluetoothEnabled?: boolean;
    sendspinSupported?: boolean;
    /** Undefined when the Sendspin switch cannot be read, e.g. while offline. */
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
      options.musicAssistantConfigured &&
      (!options.sendspinSupported || options.sendspinEnabled !== false)
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
