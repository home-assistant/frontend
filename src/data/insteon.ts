import { HassEntity } from "home-assistant-js-websocket";
import { HomeAssistant } from "../types";

export interface InsteonDevice {
  name: string;
  address: string;
  is_battery: boolean;
  aldb_status: string;
  aldb: ALDBRecord[];
  default_links: DefaultLink[];
}

export interface DefaultLink {
  is_controller: boolean;
  group: number;
  dev_data1: number;
  dev_data2: number;
  dev_data3: number;
  modem_data1: number;
  modem_data2: number;
  modem_data3: number;
}

export interface ALDBRecord {
  id: number;
  in_use: boolean;
  mode: string;
  highwater: boolean;
  group: number;
  target: string;
  target_name: string;
  data1: number;
  data2: number;
  data3: number;
}

export const fetchInsteonDevice = (
  hass: HomeAssistant,
  id: string
): Promise<InsteonDevice> =>
  hass.callWS({
    type: "insteon/device",
    device_id: id,
  });
