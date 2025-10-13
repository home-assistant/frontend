import {
  createCollection,
  type Connection,
  type UnsubscribeFunc,
} from "home-assistant-js-websocket";
import type { Store } from "home-assistant-js-websocket/dist/store";
import type { DataTableRowData } from "../components/data-table/ha-data-table";

export interface SSDPDiscoveryData extends DataTableRowData {
  name: string | undefined;
  ssdp_usn: string;
  ssdp_st: string;
  upnp: Record<string, unknown>;
  ssdp_location: string | undefined;
  ssdp_nt: string | undefined;
  ssdp_udn: string | undefined;
  ssdp_ext: string | undefined;
  ssdp_server: string | undefined;
  ssdp_headers: Record<string, unknown>;
  ssdp_all_locations: string[];
  x_homeassistant_matching_domains: string[];
}

interface SSDPRemoveDiscoveryData {
  ssdp_st: string;
  ssdp_location: string | undefined;
}

interface SSDPSubscriptionMessage {
  add?: SSDPDiscoveryData[];
  change?: SSDPDiscoveryData[];
  remove?: SSDPRemoveDiscoveryData[];
}

const subscribeSSDPDiscoveryUpdates = (
  conn: Connection,
  store: Store<SSDPDiscoveryData[]>
): Promise<UnsubscribeFunc> =>
  conn.subscribeMessage<SSDPSubscriptionMessage>(
    (event) => {
      const data = [...(store.state || [])];
      if (event.add) {
        for (const deviceData of event.add) {
          const index = data.findIndex(
            (d) =>
              d.ssdp_st === deviceData.ssdp_st &&
              d.ssdp_location === deviceData.ssdp_location
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
            (d) =>
              d.ssdp_st === deviceData.ssdp_st &&
              d.ssdp_location === deviceData.ssdp_location
          );
          if (index !== -1) {
            data[index] = deviceData;
          }
        }
      }
      if (event.remove) {
        for (const deviceData of event.remove) {
          const index = data.findIndex(
            (d) =>
              d.ssdp_st === deviceData.ssdp_st &&
              d.ssdp_location === deviceData.ssdp_location
          );
          if (index !== -1) {
            data.splice(index, 1);
          }
        }
      }

      store.setState(data, true);
    },
    {
      type: `ssdp/subscribe_discovery`,
    }
  );

export const subscribeSSDPDiscovery = (
  conn: Connection,
  callbackFunction: (ssdpDiscoveryData: SSDPDiscoveryData[]) => void
) =>
  createCollection<SSDPDiscoveryData[]>(
    "_ssdpDiscoveryRows",
    () => Promise.resolve<SSDPDiscoveryData[]>([]), // empty array as initial state

    subscribeSSDPDiscoveryUpdates,
    conn,
    callbackFunction
  );
