import { HomeAssistant } from "../types";

export interface ZWaveNetworkStatus {
  state: number;
  state_str: string;
}

export const fetchNetworkStatus = (
  hass: HomeAssistant
): Promise<ZWaveNetworkStatus> =>
  hass.callWS({
    type: "zwave/network_status",
  });
