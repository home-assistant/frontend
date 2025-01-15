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
  manufacturer_data: Record<number, string>;
  name: string;
  rssi: number;
  service_data: Record<string, string>;
  service_uuids: string[];
  source: string;
  time: number;
  tx_power: number;
}

interface BluetoothRemoveDeviceData {
  address: string;
}

interface BluetoothAdvertisementSubscriptionMessage {
  add?: BluetoothDeviceData[];
  change?: BluetoothDeviceData[];
  remove?: BluetoothRemoveDeviceData[];
}

const subscribeUpdates = (
  conn: Connection,
  store: Store<BluetoothDeviceData[]>
): Promise<UnsubscribeFunc> =>
  conn.subscribeMessage<BluetoothAdvertisementSubscriptionMessage>(
    (event) => {
      const data = [...(store.state || [])];
      if (event.add) {
        for (const device_data of event.add) {
          const index = data.findIndex(
            (d) => d.address === device_data.address
          );
          if (index === -1) {
            data.push(device_data);
          } else {
            data[index] = device_data;
          }
        }
      }
      if (event.change) {
        for (const device_data of event.change) {
          const index = data.findIndex(
            (d) => d.address === device_data.address
          );
          if (index !== -1) {
            data[index] = device_data;
          }
        }
      }
      if (event.remove) {
        for (const device_data of event.remove) {
          const index = data.findIndex(
            (d) => d.address === device_data.address
          );
          if (index !== -1) {
            data.splice(index, 1);
          }
        }
      }

      store.setState(data, true);
    },
    {
      type: `bluetooth/subscribe_advertisements`,
    }
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
