import { HassEntity } from "home-assistant-js-websocket";
import { HomeAssistant } from "../types";
import type { HaFormSchema } from "../components/ha-form/ha-form";
import { HassioHomeAssistantInfo } from "./hassio/supervisor";

export interface InsteonDevice {
  name: string;
  address: string;
  is_battery: boolean;
  aldb_status: string;
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
  mem_addr: number;
  in_use: boolean;
  mode: string;
  highwater: boolean;
  group: number;
  target: string;
  target_name: string;
  data1: number;
  data2: number;
  data3: number;
  is_dirty: boolean;
}

export interface ALDBInfo {
  schema: HaFormSchema;
  records: ALDBRecord[];
}

export const fetchInsteonDevice = (
  hass: HomeAssistant,
  id: string
): Promise<InsteonDevice> =>
  hass.callWS({
    type: "insteon/device/get",
    device_id: id,
  });

export const fetchInsteonALDB = (
  hass: HomeAssistant,
  id: string
): Promise<ALDBInfo> =>
  hass.callWS({
    type: "insteon/aldb/get",
    device_id: id,
  });

export const changeALDBRecord = (
  hass: HomeAssistant,
  record: ALDBRecord
): Promise<ALDBRecord> =>
  hass.callWS({
    type: "insteon/aldb/change",
    record: record,
  });
