import {
  createCollection,
  type Connection,
  type UnsubscribeFunc,
} from "home-assistant-js-websocket";
import type { Store } from "home-assistant-js-websocket/dist/store";
import type { DataTableRowData } from "../components/data-table/ha-data-table";

export interface DHCPDiscoveryData extends DataTableRowData {
  mac_address: string;
  hostname: string;
  ip_address: string;
}

interface DHCPRemoveDiscoveryData {
  mac_address: string;
}

interface DHCPSubscriptionMessage {
  add?: DHCPDiscoveryData[];
  change?: DHCPDiscoveryData[];
  remove?: DHCPRemoveDiscoveryData[];
}

const subscribeDHCPDiscoveryUpdates = (
  conn: Connection,
  store: Store<DHCPDiscoveryData[]>
): Promise<UnsubscribeFunc> =>
  conn.subscribeMessage<DHCPSubscriptionMessage>(
    (event) => {
      const data = [...(store.state || [])];
      if (event.add) {
        for (const deviceData of event.add) {
          const index = data.findIndex(
            (d) => d.mac_address === deviceData.mac_address
          );
          if (index === -1) {
            data.push(deviceData);
          } else {
            data[index] = deviceData;
          }
        }
      }
      if (event.change) {
        for (const deviceData of event.change) {
          const index = data.findIndex(
            (d) => d.mac_address === deviceData.mac_address
          );
          if (index !== -1) {
            data[index] = deviceData;
          }
        }
      }
      if (event.remove) {
        for (const deviceData of event.remove) {
          const index = data.findIndex(
            (d) => d.mac_address === deviceData.mac_address
          );
          if (index !== -1) {
            data.splice(index, 1);
          }
        }
      }

      store.setState(data, true);
    },
    {
      type: `dhcp/subscribe_discovery`,
    }
  );

export const subscribeDHCPDiscovery = (
  conn: Connection,
  callbackFunction: (dhcpDiscoveryData: DHCPDiscoveryData[]) => void
) =>
  createCollection<DHCPDiscoveryData[]>(
    "_dhcpDiscoveryRows",
    () => Promise.resolve<DHCPDiscoveryData[]>([]), // empty array as initial state

    subscribeDHCPDiscoveryUpdates,
    conn,
    callbackFunction
  );
