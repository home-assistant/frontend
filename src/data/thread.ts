import { HomeAssistant } from "../types";

export interface ThreadRouter {
  brand: "google" | "apple" | "homeassistant";
  server: string;
  extended_pan_id: string;
  extended_address: string;
  model_name: string | null;
  network_name: string;
  vendor_name: string;
}

export interface ThreadDataSet {
  created: string;
  dataset_id: string;
  preferred: boolean;
  source: string;
  network_name: string;
  extended_pan_id?: string;
  pan_id?: string;
}

export interface ThreadRouterDiscoveryEvent {
  key: string;
  type: "router_discovered" | "router_removed";
  data: ThreadRouter;
}

class DiscoveryStream {
  routers: { [key: string]: ThreadRouter };

  constructor() {
    this.routers = {};
  }

  processEvent(streamMessage: ThreadRouterDiscoveryEvent): ThreadRouter[] {
    if (streamMessage.type === "router_discovered") {
      this.routers[streamMessage.key] = streamMessage.data;
    } else if (streamMessage.type === "router_removed") {
      delete this.routers[streamMessage.key];
    }
    return Object.values(this.routers);
  }
}

export const subscribeDiscoverThreadRouters = (
  hass: HomeAssistant,
  callbackFunction: (routers: ThreadRouter[]) => void
) => {
  const stream = new DiscoveryStream();
  return hass.connection.subscribeMessage<ThreadRouterDiscoveryEvent>(
    (message) => callbackFunction(stream.processEvent(message)),
    {
      type: "thread/discover_routers",
    }
  );
};

export const listThreadDataSets = (
  hass: HomeAssistant
): Promise<{ datasets: ThreadDataSet[] }> =>
  hass.callWS({
    type: "thread/list_datasets",
  });

export const getThreadDataSetTLV = (
  hass: HomeAssistant,
  dataset_id: string
): Promise<{ tlv: string }> =>
  hass.callWS({ type: "thread/get_dataset_tlv", dataset_id });

export const addThreadDataSet = (
  hass: HomeAssistant,
  source: string,
  tlv: string
): Promise<void> =>
  hass.callWS({
    type: "thread/add_dataset_tlv",
    source,
    tlv,
  });

export const removeThreadDataSet = (
  hass: HomeAssistant,
  dataset_id: string
): Promise<void> =>
  hass.callWS({
    type: "thread/delete_dataset",
    dataset_id,
  });

export const setPreferredThreadDataSet = (
  hass: HomeAssistant,
  dataset_id: string
): Promise<void> =>
  hass.callWS({
    type: "thread/set_preferred_dataset",
    dataset_id,
  });
