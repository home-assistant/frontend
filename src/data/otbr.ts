import { HomeAssistant } from "../types";

export interface OTBRInfo {
  active_dataset_tlvs: string;
  channel: number;
  extended_address: string;
  url: string;
}

export const getOTBRInfo = (hass: HomeAssistant): Promise<OTBRInfo> =>
  hass.callWS({
    type: "otbr/info",
  });

export const OTBRCreateNetwork = (hass: HomeAssistant): Promise<void> =>
  hass.callWS({
    type: "otbr/create_network",
  });

export const OTBRSetNetwork = (
  hass: HomeAssistant,
  dataset_id: string
): Promise<void> =>
  hass.callWS({
    type: "otbr/set_network",
    dataset_id,
  });

export const OTBRSetChannel = (
  hass: HomeAssistant,
  channel: number
): Promise<{ delay: number }> =>
  hass.callWS({
    type: "otbr/set_channel",
    channel,
  });
