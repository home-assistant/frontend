import { HomeAssistant } from "../types";

export interface ThreadInfo {
  url: string;
  active_dataset_tlvs: string;
}

export const threadGetInfo = (hass: HomeAssistant): Promise<ThreadInfo> =>
  hass.callWS({
    type: "otbr/info",
  });
