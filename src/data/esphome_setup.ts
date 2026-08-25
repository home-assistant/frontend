import { computeDomain } from "../common/entity/compute_domain";
import type { ConfigEntry } from "./config_entries";
import type { DeviceRegistryEntry } from "./device/device_registry";
import type { ESPHomeDeviceCapabilities } from "./esphome";
import type { ESPHomeFrontendUserData } from "./frontend";

export const MUSIC_ASSISTANT_ADDON_SLUG = "d5369777_music_assistant";

export const MUSIC_ASSISTANT_DOCS_URL = "https://music-assistant.io/";

export const ESPHOME_SERIAL_INTEGRATIONS = [
  "anthemav",
  "monoprice",
  "russound_rio",
  "jvc_projector",
  "elkm1",
] as const;

export type ESPHomeSerialIntegrationDomain =
  (typeof ESPHOME_SERIAL_INTEGRATIONS)[number];

export type ESPHomeCapabilityId =
  "bluetooth" | "audio" | "connectivity" | "serial";

export type ESPHomeCapabilityStatus =
  "not-started" | "active" | "detected" | "completed";

export interface ESPHomeSetupStatus {
  bluetooth?: "completed";
  audio?: "active" | "completed";
  connectivity?: "not-started" | "detected" | "completed";
  serial?: "not-started";
}

export const CAPABILITY_ORDER: ESPHomeCapabilityId[] = [
  "bluetooth",
  "audio",
  "connectivity",
  "serial",
];

/** Capability accents from the ESPHome device setup prototype. */
export const ESPHOME_CAPABILITY_ACCENTS: Record<ESPHomeCapabilityId, string> = {
  bluetooth: "#2962ff",
  audio: "#53c22b",
  connectivity: "#00acc1",
  serial: "#8353d1",
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

export const hasESPHomeSetupCapabilities = (
  capabilities: ESPHomeDeviceCapabilities | undefined | null,
  options: { mediaPlayerSupported?: boolean } = {}
): boolean =>
  Boolean(
    capabilities?.available &&
    (capabilities.bluetooth_proxy.supported ||
      options.mediaPlayerSupported ||
      capabilities.zwave_proxy.supported ||
      capabilities.serial_proxies.length > 0)
  );

export const hasZWaveJSEntryForDevice = (
  deviceId: string,
  devices: Record<string, DeviceRegistryEntry>,
  entries: ConfigEntry[]
): boolean => {
  const zwaveEntryIds = new Set(
    entries
      .filter((entry) => entry.domain === "zwave_js" && !entry.disabled_by)
      .map((entry) => entry.entry_id)
  );
  if (!zwaveEntryIds.size) {
    return false;
  }
  const device = devices[deviceId];
  if (device?.config_entries.some((entryId) => zwaveEntryIds.has(entryId))) {
    return true;
  }
  return Object.values(devices).some(
    (candidate) =>
      candidate.via_device_id === deviceId &&
      candidate.config_entries.some((entryId) => zwaveEntryIds.has(entryId))
  );
};

export const deriveESPHomeSetupStatus = (
  capabilities: ESPHomeDeviceCapabilities,
  options: {
    mediaPlayerSupported: boolean;
    musicAssistantLoaded: boolean;
    zwaveJsEntryExists: boolean;
  }
): ESPHomeSetupStatus => {
  const status: ESPHomeSetupStatus = {};

  if (capabilities.bluetooth_proxy.supported) {
    status.bluetooth = "completed";
  }

  if (options.mediaPlayerSupported) {
    status.audio = options.musicAssistantLoaded ? "completed" : "active";
  }

  if (capabilities.zwave_proxy.supported) {
    if (options.zwaveJsEntryExists) {
      status.connectivity = "completed";
    } else if (capabilities.zwave_proxy.home_id !== 0) {
      status.connectivity = "detected";
    } else {
      status.connectivity = "not-started";
    }
  }

  if (capabilities.serial_proxies.length > 0) {
    status.serial = "not-started";
  }

  return status;
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
  status.audio === "completed" || status.connectivity === "completed";

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
