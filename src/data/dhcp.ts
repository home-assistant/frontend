import {
  getCollection,
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
): Promise<UnsubscribeFunc> => {
  // Core sends all current devices first on every (re)subscribe, so replace
  // the list with that snapshot rather than merging into stale rows
  let isSnapshot = true;
  const handleReady = () => {
    isSnapshot = true;
  };
  conn.addEventListener("ready", handleReady);

  return conn
    .subscribeMessage<DHCPSubscriptionMessage>(
      (event) => {
        const data = isSnapshot ? [] : [...(store.state || [])];
        isSnapshot = false;
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
    )
    .then((unsubscribe) => () => {
      conn.removeEventListener("ready", handleReady);
      return unsubscribe();
    });
};

export const subscribeDHCPDiscovery = (
  conn: Connection,
  callbackFunction: (dhcpDiscoveryData: DHCPDiscoveryData[]) => void
) =>
  // The subscription sends the current devices first, so skip the fetch to
  // avoid reporting an empty list before that arrives
  getCollection<DHCPDiscoveryData[]>(
    conn,
    "_dhcpDiscoveryRows",
    undefined,
    subscribeDHCPDiscoveryUpdates
  ).subscribe(callbackFunction);
