import { HomeAssistant } from "../types";

export interface OTBRInfo {
  active_dataset_tlvs: string;
  border_agent_id: string;
  channel: number;
  extended_address: string;
  extended_pan_id: string;
  url: string;
}

export type OTBRInfoDict = Record<string, OTBRInfo>;

export const getOTBRInfo = (hass: HomeAssistant): Promise<OTBRInfoDict> =>
  hass.callWS({
    type: "otbr/info",
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
