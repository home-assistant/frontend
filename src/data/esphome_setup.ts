import { computeDomain } from "../common/entity/compute_domain";
import type { ESPHomeDeviceCapabilities, ESPHomeSerialProxy } from "./esphome";
import type { ESPHomeFrontendUserData } from "./frontend";
import type { SerialPortUsage } from "./usb";

export const MUSIC_ASSISTANT_ADDON_SLUG = "d5369777_music_assistant";

export const MUSIC_ASSISTANT_DOCS_URL = "https://music-assistant.io/";

export type ESPHomeCapabilityId =
  "bluetooth" | "audio" | "connectivity" | "serial";

export type ESPHomeCapabilityStatus = "not-started" | "detected" | "completed";

export interface ESPHomeSetupStatus {
  bluetooth?: "completed";
  audio?: "not-started" | "completed";
  connectivity?: "not-started" | "detected" | "completed";
  serial?: "not-started" | "completed";
}

export interface ESPHomeDeviceEntityRef {
  entity_id: string;
  device_id?: string | null;
  platform?: string;
  translation_key?: string | null;
  name?: string | null;
}

export interface ESPHomeEntityStateRef {
  state: string;
  attributes?: { friendly_name?: string };
}

export interface ESPHomeAudioControls {
  supported: boolean;
  sendspinEntityId?: string;
  sendspinOn: boolean;
  sendspinAvailable: boolean;
  guestEntityId?: string;
  guestOn: boolean;
  guestAvailable: boolean;
  /** The guest switch's on state means a PIN is required, not open guest access. */
  guestRequiresPin: boolean;
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

const normalizeAudioLabel = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const requiresPinLabel = (text: string): boolean =>
  text.includes("require pin") ||
  text.includes("pin to play") ||
  text.includes("pin to stream");

const endsWithPhrase = (text: string, phrase: string): boolean =>
  text === phrase || text.endsWith(` ${phrase}`);

const hasWord = (text: string, word: string): boolean =>
  text.split(" ").includes(word);

/** Guest-access phrases. A bare "guest" word only counts as a suffix so a device name cannot match. */
const explicitGuestAccess = (text: string): boolean =>
  text.includes("guest mode") ||
  text.includes("guest pairing") ||
  text.includes("sendspin guest") ||
  endsWithPhrase(text, "guest");

const objectIdLabel = (entityId: string): string =>
  normalizeAudioLabel(entityId.split(".")[1] ?? "");

const switchIsAvailable = (state?: string): boolean =>
  state === "on" || state === "off";

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
  let sendspinEntityId: string | undefined;
  let guestEntityId: string | undefined;
  let guestRequiresPin = false;
  let sendspinScore = Number.POSITIVE_INFINITY;
  let guestScore = Number.POSITIVE_INFINITY;

  for (const entity of entities) {
    if (
      entity.device_id !== deviceId ||
      computeDomain(entity.entity_id) !== "switch" ||
      (entity.platform && entity.platform !== "esphome")
    ) {
      continue;
    }
    const state = states[entity.entity_id];
    const ownName = normalizeAudioLabel(
      [entity.translation_key, entity.name].filter(Boolean).join(" ")
    );
    const friendlyName = normalizeAudioLabel(
      state?.attributes?.friendly_name ?? ""
    );
    const objectId = objectIdLabel(entity.entity_id);
    const labels = [ownName, friendlyName, objectId].filter(Boolean);
    const pin = labels.some(requiresPinLabel);
    // translation_key and the registry name are the entity's own name.
    // Friendly name and object id also include the device name, so a bare
    // "guest"/"sendspin" token there only counts as a suffix.
    const guestAccess =
      explicitGuestAccess(ownName) ||
      hasWord(ownName, "guest") ||
      [friendlyName, objectId].some(explicitGuestAccess);
    const guest = pin || guestAccess;
    const sendspin =
      !guest &&
      (hasWord(ownName, "sendspin") ||
        endsWithPhrase(friendlyName, "sendspin") ||
        endsWithPhrase(objectId, "sendspin"));
    if (!guest && !sendspin) {
      continue;
    }
    const score =
      entity.translation_key === "sendspin" ||
      entity.translation_key === "guest" ||
      (guest && entity.translation_key?.includes("pin"))
        ? 0
        : endsWithPhrase(objectId, "sendspin")
          ? 1
          : 2;
    if (guest && score < guestScore) {
      guestEntityId = entity.entity_id;
      guestRequiresPin = pin && !guestAccess;
      guestScore = score;
    } else if (sendspin && score < sendspinScore) {
      sendspinEntityId = entity.entity_id;
      sendspinScore = score;
    }
  }

  const sendspinState = sendspinEntityId
    ? states[sendspinEntityId]?.state
    : undefined;
  const guestState = guestEntityId ? states[guestEntityId]?.state : undefined;
  const guestEntityOn = guestState === "on";

  return {
    supported:
      deviceHasMediaPlayerEntity(deviceId, entities) ||
      Boolean(sendspinEntityId) ||
      Boolean(guestEntityId),
    sendspinEntityId,
    sendspinOn: sendspinState === "on",
    sendspinAvailable: switchIsAvailable(sendspinState),
    guestEntityId,
    guestOn: guestRequiresPin ? guestState === "off" : guestEntityOn,
    guestAvailable: switchIsAvailable(guestState),
    guestRequiresPin,
  };
};

/**
 * Whether the device page should show the setup banner.
 * Bluetooth is status inside the wizard and is not enough on its own.
 * Zigbee has no separate capability bit; the Z-Wave proxy row covers it.
 */
export const hasESPHomeSetupCapabilities = (
  capabilities: ESPHomeDeviceCapabilities | undefined | null,
  options: { mediaPlayerSupported?: boolean } = {}
): boolean =>
  Boolean(
    capabilities &&
    (options.mediaPlayerSupported ||
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
    sendspinSupported?: boolean;
    sendspinEnabled?: boolean;
    serialConfigured?: boolean;
  }
): ESPHomeSetupStatus => {
  const status: ESPHomeSetupStatus = {};

  if (capabilities.bluetooth_proxy.supported) {
    status.bluetooth = "completed";
  }

  if (options.mediaPlayerSupported || options.sendspinSupported) {
    // Stay actionable until Music Assistant is installed and Sendspin is on.
    // A missing Sendspin switch is not the same as Sendspin being enabled.
    status.audio =
      options.musicAssistantLoaded && options.sendspinEnabled
        ? "completed"
        : "not-started";
  }

  if (capabilities.zwave_proxy.supported) {
    if (capabilities.zwave_proxy.config_entry_id) {
      status.connectivity = "completed";
    } else if (capabilities.zwave_proxy.home_id !== 0) {
      status.connectivity = "detected";
    } else {
      status.connectivity = "not-started";
    }
  }

  if (capabilities.serial_proxies.length > 0) {
    status.serial = options.serialConfigured ? "completed" : "not-started";
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
  status.audio === "completed" ||
  status.connectivity === "completed" ||
  status.serial === "completed";

export type ESPHomeSetupBannerState = "setup" | "continue" | "complete";

/** Headline state for the device-page setup banner. */
export const getESPHomeSetupBannerState = (
  status: ESPHomeSetupStatus
): ESPHomeSetupBannerState => {
  if (countRemainingESPHomeCapabilities(status) === 0) {
    return "complete";
  }
  return hasStartedNonBluetoothESPHomeSetup(status) ? "continue" : "setup";
};

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
