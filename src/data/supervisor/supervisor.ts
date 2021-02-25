import { Connection, getCollection } from "home-assistant-js-websocket";
import { Store } from "home-assistant-js-websocket/dist/store";
import { HomeAssistant } from "../../types";
import { HassioAddonsInfo } from "../hassio/addon";
import { HassioHassOSInfo, HassioHostInfo } from "../hassio/host";
import { NetworkInfo } from "../hassio/network";
import { HassioResolution } from "../hassio/resolution";
import {
  HassioHomeAssistantInfo,
  HassioInfo,
  HassioSupervisorInfo,
} from "../hassio/supervisor";

export const supervisorWSbaseCommand = {
  type: "supervisor/api",
  method: "GET",
};

export const supervisorStore = {
  host: "/host/info",
  supervisor: "/supervisor/info",
  info: "/info",
  core: "/core/info",
  network: "/network/info",
  resolution: "/resolution/info",
  os: "/os/info",
  addon: "/addons",
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
  | "addon";

interface supervisorApiRequest {
  endpoint: string;
  method?: "get" | "post" | "delete" | "put";
  force_rest?: boolean;
  data?: any;
}

export interface SupervisorEvent {
  event: string;
  update_key?: SupervisorObject;
  data?: any;
  [key: string]: any;
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
}

export const supervisorApiWsRequest = <T>(
  conn: Connection,
  request: supervisorApiRequest
): Promise<T> =>
  conn.sendMessagePromise<T>({ ...supervisorWSbaseCommand, ...request });

async function processEvent(
  conn: Connection,
  store: Store<any>,
  event: SupervisorEvent,
  key: string
) {
  if (
    !event.data ||
    event.data.event !== "supervisor-update" ||
    event.data.update_key !== key
  ) {
    return;
  }

  if (Object.keys(event.data.data).length === 0) {
    const data = await supervisorApiWsRequest<any>(conn, {
      endpoint: supervisorStore[key],
    });
    store.setState(data);
    return;
  }

  const state = store.state;
  if (state === undefined) {
    return;
  }

  store.setState({
    ...state,
    ...event.data.data,
  });
}

const subscribeSupervisorEventUpdates = (
  conn: Connection,
  store: Store<unknown>,
  key: string
) =>
  conn.subscribeEvents(
    (event) => processEvent(conn, store, event as SupervisorEvent, key),
    "supervisor_event"
  );

export const getSupervisorEventCollection = (
  conn: Connection,
  key: string,
  endpoint: string
) =>
  getCollection(
    conn,
    `_supervisor${key}Event`,
    () => supervisorApiWsRequest(conn, { endpoint }),
    (connection, store) =>
      subscribeSupervisorEventUpdates(connection, store, key)
  );

export const subscribeSupervisorEvents = (
  hass: HomeAssistant,
  onChange: (event) => void,
  key: string,
  endpoint: string
) =>
  getSupervisorEventCollection(hass.connection, key, endpoint).subscribe(
    onChange
  );
