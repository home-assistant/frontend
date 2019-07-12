import { HomeAssistant } from "../types";

export interface ZWaveNetworkStatus {
  state: number;
}

export const ZWAVE_NETWORK_STATE_STOPPED = 0;
export const ZWAVE_NETWORK_STATE_FAILED = 1;
export const ZWAVE_NETWORK_STATE_STARTED = 5;
export const ZWAVE_NETWORK_STATE_AWAKED = 7;
export const ZWAVE_NETWORK_STATE_READY = 10;

export const fetchNetworkStatus = (
  hass: HomeAssistant
): Promise<ZWaveNetworkStatus> =>
  hass.callWS({
    type: "zwave/network_status",
  });
