import { HomeAssistant } from "../types";

export interface OTBRInfo {
  url: string;
  active_dataset_tlvs: string;
}

export const getOTBRInfo = (hass: HomeAssistant): Promise<OTBRInfo> =>
  hass.callWS({
    type: "otbr/info",
  });
