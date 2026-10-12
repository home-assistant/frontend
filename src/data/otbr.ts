import type { HomeAssistant } from "../types";
import type { ThreadDataSet } from "./thread";

export interface OTBRInfo {
  active_dataset_tlvs: string | null;
  border_agent_id: string;
  channel: number | null;
  extended_address: string;
  extended_pan_id: string | null;
  url: string;
}

export type OTBRInfoDict = Record<string, OTBRInfo>;

export const findOTBRInfoForDataset = (
  otbrInfo: OTBRInfoDict | undefined,
  dataset: ThreadDataSet
): OTBRInfo | undefined => {
  if (!otbrInfo) {
    return undefined;
  }

  const preferredAddress = dataset.preferred_extended_address;
  if (preferredAddress && otbrInfo[preferredAddress]) {
    return otbrInfo[preferredAddress];
  }

  return Object.values(otbrInfo).find(
    (otbr) => otbr.extended_pan_id === dataset.extended_pan_id
  );
};

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
