import {
  createCollection,
  type Connection,
  type UnsubscribeFunc,
} from "home-assistant-js-websocket";
import type { Store } from "home-assistant-js-websocket/dist/store";
import type { DataTableRowData } from "../components/data-table/ha-data-table";

export interface BluetoothDeviceData extends DataTableRowData {
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

const subscribeUpdates = (
  connection: Connection,
  store: Store<BluetoothDeviceData[]>
): Promise<UnsubscribeFunc> =>
  connection.subscribeEvents<BluetoothDeviceData[]>(
    (data) => store.setState(data, true),
    `bluetooth/subscribe_advertisements`
  );

export const subscribeBluetoothAdvertisements = (
  conn: Connection,
  onChange: (bluetoothDeviceData: BluetoothDeviceData[]) => void
) =>
  createCollection<BluetoothDeviceData[]>(
    "_bluetoothDeviceRows",
    () =>
      new Promise<BluetoothDeviceData[]>((resolve) => {
        resolve([]);
      }), // empty array as initial state
    subscribeUpdates,
    conn,
    onChange
  );
