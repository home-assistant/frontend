import { HomeAssistant } from "../types";

export interface ZWaveJSNetwork {
  client: ZWaveJSClient;
  controller: ZWaveJSController;
}

export interface ZWaveJSClient {
  state: string;
  ws_server_url: string;
  server_version: string;
  driver_version: string;
}

export interface ZWaveJSController {
  home_id: string;
  node_count: number;
}

export const fetchNetworkStatus = (
  hass: HomeAssistant,
  entry_id: string
): Promise<ZWaveJSNetwork> =>
  hass.callWS({
    type: "zwave_js/network_status",
    entry_id,
  });
