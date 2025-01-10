import type { UnsubscribeFunc } from "home-assistant-js-websocket";
import type { HomeAssistant } from "../types";
import type { DataTableRowData } from "../components/data-table/ha-data-table";

export interface DeviceRowData extends DataTableRowData {
  address: string;
  connectable: boolean;
  manufacturer_data: { [id: number]: string };
  name: string;
  rssi: number;
  service_data: { [id: string]: string };
  service_uuids: string[];
  source: string;
  time: number;
  tx_power: number;
}

export interface RemoveDeviceRowData {
  address: string;
}

export interface EventDataMessage {
  add?: DeviceRowData[];
  change?: DeviceRowData[];
  remove?: RemoveDeviceRowData[];
}

export const subscribeBluetoothAdvertisements = (
  hass: HomeAssistant,
  callback: (event: EventDataMessage) => void
): Promise<UnsubscribeFunc> =>
  hass.connection.subscribeMessage(callback, {
    type: `bluetooth/subscribe_advertisements`,
  });
