import { HomeAssistant } from "../types";
import { DeviceRegistryEntry } from "./device_registry";

export interface RfxtrxNodeIdentifiers {
  packet_type: number;
  sub_type: number;
  id_string: string;
}

export const getIdentifiersFromDevice = function (
  device: DeviceRegistryEntry
): RfxtrxNodeIdentifiers | undefined {
  if (!device) {
    return undefined;
  }

  const rfxtrxIdentifier = device.identifiers.find(
    (identifier) => identifier[0] === "rfxtrx"
  );
  if (!rfxtrxIdentifier) {
    return undefined;
  }

  let identifiers = rfxtrxIdentifier[1].split(".", 3);
  if (identifiers.length === 1)
    identifiers = (
      rfxtrxIdentifier as unknown as [string, string, string, string]
    ).slice(1);
  return {
    packet_type: parseInt(identifiers[0]),
    sub_type: parseInt(identifiers[1]),
    id_string: identifiers[2],
  };
};

export const removeRfxtrxDeviceEntry = (
  hass: HomeAssistant,
  deviceId: string
): Promise<void> =>
  hass.callWS({
    type: "rfxtrx/device/remove",
    device_id: deviceId,
  });
