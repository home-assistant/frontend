import { HomeAssistant } from "../types";

export interface ThreadRouter {
  brand: "google" | "apple" | "homeassistant";
  server: string;
  extended_pan_id: string;
  model_name: string | null;
  network_name: string;
  vendor_name: string;
}

export interface ThreadDataSet {
  created;
  dataset_id;
  extended_pan_id;
  network_name: string;
  pan_id;
  preferred: boolean;
  source;
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
