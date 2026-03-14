import {
  createCollection,
  type Connection,
  type UnsubscribeFunc,
} from "home-assistant-js-websocket";
import type { Store } from "home-assistant-js-websocket/dist/store";
import type { DataTableRowData } from "../components/data-table/ha-data-table";

export interface ZeroconfDiscoveryData extends DataTableRowData {
  name: string;
  type: string;
  port: number;
  properties: Record<string, unknown>;
  ip_addresses: string[];
}

interface ZeroconfRemoveDiscoveryData {
  name: string;
}

interface ZeroconfSubscriptionMessage {
  add?: ZeroconfDiscoveryData[];
  change?: ZeroconfDiscoveryData[];
  remove?: ZeroconfRemoveDiscoveryData[];
}

const subscribeZeroconfDiscoveryUpdates = (
  conn: Connection,
  store: Store<ZeroconfDiscoveryData[]>
): Promise<UnsubscribeFunc> =>
  conn.subscribeMessage<ZeroconfSubscriptionMessage>(
    (event) => {
      const data = [...(store.state || [])];
      if (event.add) {
        for (const deviceData of event.add) {
          const index = data.findIndex((d) => d.name === deviceData.name);
          if (index === -1) {
            data.push(deviceData);
          } else {
            data[index] = deviceData;
          }
        }
      }
      if (event.change) {
        for (const deviceData of event.change) {
          const index = data.findIndex((d) => d.name === deviceData.name);
          if (index !== -1) {
            data[index] = deviceData;
          }
        }
      }
      if (event.remove) {
        for (const deviceData of event.remove) {
          const index = data.findIndex((d) => d.name === deviceData.name);
          if (index !== -1) {
            data.splice(index, 1);
          }
        }
      }

      store.setState(data, true);
    },
    {
      type: `zeroconf/subscribe_discovery`,
    }
  );

export const subscribeZeroconfDiscovery = (
  conn: Connection,
  callbackFunction: (zeroconfDiscoveryData: ZeroconfDiscoveryData[]) => void
) =>
  createCollection<ZeroconfDiscoveryData[]>(
    "_zeroconfDiscoveryRows",
    () => Promise.resolve<ZeroconfDiscoveryData[]>([]), // empty array as initial state

    subscribeZeroconfDiscoveryUpdates,
    conn,
    callbackFunction
  );
