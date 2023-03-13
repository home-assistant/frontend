import { HomeAssistant } from "../types";

export interface OTBRInfo {
  url: string;
  active_dataset_tlvs: string;
}

export const getOTBRInfo = (hass: HomeAssistant): Promise<OTBRInfo> =>
  hass.callWS({
    type: "otbr/info",
  });

export const OTBRCreateNetwork = (hass: HomeAssistant): Promise<void> =>
  hass.callWS({
    type: "otbr/create_network",
  });

export const OTBRGetExtendedAddress = (
  hass: HomeAssistant
): Promise<{ extended_address: string }> =>
  hass.callWS({
    type: "otbr/get_extended_address",
  });
