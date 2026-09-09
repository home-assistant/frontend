import type { Connection, UnsubscribeFunc } from "home-assistant-js-websocket";
import { getCollection } from "home-assistant-js-websocket";
import type { Store } from "home-assistant-js-websocket/dist/store";
import type { AddonState, HassioAddonsInfo } from "../hassio/addon";
import type { HassioHassOSInfo, HassioHostInfo } from "../hassio/host";
import type { NetworkInfo } from "../hassio/network";
import type { HassioResolution } from "../hassio/resolution";
import type {
  HassioHomeAssistantInfo,
  HassioInfo,
  HassioSupervisorInfo,
} from "../hassio/supervisor";
import type { SupervisorStore } from "./store";

export const supervisorWSbaseCommand = {
  type: "supervisor/api",
  method: "GET",
};

export const supervisorCollection = {
  host: "/host/info",
  supervisor: "/supervisor/info",
  info: "/info",
  core: "/core/info",
  network: "/network/info",
  resolution: "/resolution/info",
  os: "/os/info",
  addon: "/addons",
  store: "/store",
};

export type SupervisorArch = "armhf" | "armv7" | "aarch64" | "i386" | "amd64";
export type SupervisorObject =
  | "host"
  | "supervisor"
  | "info"
  | "core"
  | "network"
  | "resolution"
  | "os"
  | "addon"
  | "store";

interface SupervisorApiRequest {
  endpoint: string;
  method?: "get" | "post" | "delete" | "put";
  force_rest?: boolean;
  data?: any;
  timeout?: number | null;
}

export interface SupervisorEvent {
  event: string;
  update_key?: SupervisorObject;
  data?: any;
  [key: string]: any;
}

export interface SupervisorAppEvent {
  event: "app" | "addon";
  slug: string;
  state: AddonState;
}

export interface Supervisor {
  host: HassioHostInfo;
  supervisor: HassioSupervisorInfo;
  info: HassioInfo;
  core: HassioHomeAssistantInfo;
  network: NetworkInfo;
  resolution: HassioResolution;
  os: HassioHassOSInfo;
  addon: HassioAddonsInfo;
  store: SupervisorStore;
}

export const supervisorApiWsRequest = <T>(
  conn: Connection,
  request: SupervisorApiRequest
): Promise<T> =>
  conn.sendMessagePromise<T>({ ...supervisorWSbaseCommand, ...request });

async function processEvent(
  conn: Connection,
  store: Store<any>,
  event: SupervisorEvent,
  key: string
) {
  if (event.event !== "supervisor_update" || event.update_key !== key) {
    return;
  }

  if (Object.keys(event.data).length === 0) {
    const data = await supervisorApiWsRequest<any>(conn, {
      endpoint: supervisorCollection[key],
    });
    store.setState(data, true);
    return;
  }

  const state = store.state;
  if (state === undefined) {
    return;
  }

  store.setState(event.data);
}

const subscribeSupervisorEvents = (
  conn: Connection,
  callback: (event: SupervisorEvent) => void
): Promise<UnsubscribeFunc> =>
  conn.subscribeMessage<SupervisorEvent>(callback, {
    type: "supervisor/subscribe",
  });

/**
 * Subscribe to app state transitions. Supervisor names the event "addon" until
 * its websocket v2 API is enabled, so both names are accepted.
 */
export const subscribeSupervisorAppEvents = (
  conn: Connection,
  callback: (event: SupervisorAppEvent) => void
): Promise<UnsubscribeFunc> =>
  subscribeSupervisorEvents(conn, (event) => {
    if (event.event === "app" || event.event === "addon") {
      callback(event as SupervisorAppEvent);
    }
  });

const subscribeSupervisorEventUpdates = (
  conn: Connection,
  store: Store<unknown>,
  key: string
) =>
  subscribeSupervisorEvents(conn, (event) =>
    processEvent(conn, store, event, key)
  );

export const getSupervisorEventCollection = (
  conn: Connection,
  key: string,
  endpoint: string
) =>
  getCollection(
    conn,
    `_supervisor${key}Event`,
    (conn2) => supervisorApiWsRequest(conn2, { endpoint }),
    (connection, store) =>
      subscribeSupervisorEventUpdates(connection, store, key),
    { unsubGrace: false }
  );

export const cleanupSupervisorCollection = (conn: Connection, key: string) =>
  delete conn[`_supervisor${key}Event`];
