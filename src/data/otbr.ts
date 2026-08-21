import type { HomeAssistant, HomeAssistantApi } from "../types";

export interface OTBRInfo {
  active_dataset_tlvs: string;
  border_agent_id: string;
  channel: number;
  extended_address: string;
  extended_pan_id: string;
  ephemeral_key_supported: boolean;
  url: string;
}

export type OTBRInfoDict = Record<string, OTBRInfo>;

export const getOTBRInfo = (hass: HomeAssistant): Promise<OTBRInfoDict> =>
  hass.callWS({
    type: "otbr/info",
  });

export interface OTBREphemeralKey {
  ephemeral_key: string;
  lifetime: number;
  port: number;
}

export const OTBRCreateEphemeralKey = (
  hass: HomeAssistant,
  extended_address: string
): Promise<OTBREphemeralKey> =>
  hass.callWS({
    type: "otbr/create_ephemeral_key",
    extended_address,
  });

export const OTBRDeleteEphemeralKey = (
  api: HomeAssistantApi,
  extended_address: string
): Promise<void> =>
  api.callWS({
    type: "otbr/delete_ephemeral_key",
    extended_address,
  });

export const OTBRCreateNetwork = (
  hass: HomeAssistant,
  extended_address: string
): Promise<void> =>
  hass.callWS({
    type: "otbr/create_network",
    extended_address,
  });

export const OTBRSetNetwork = (
  hass: HomeAssistant,
  extended_address: string,
  dataset_id: string
): Promise<void> =>
  hass.callWS({
    type: "otbr/set_network",
    extended_address,
    dataset_id,
  });

export const OTBRSetChannel = (
  hass: HomeAssistant,
  extended_address: string,
  channel: number
): Promise<{ delay: number }> =>
  hass.callWS({
    type: "otbr/set_channel",
    extended_address,
    channel,
  });
