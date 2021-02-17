import { Connection, getCollection } from "home-assistant-js-websocket";
import { Store } from "home-assistant-js-websocket/dist/store";
import { HomeAssistant } from "../../types";
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
  method: "get",
};

export type SupervisorArch = "armhf" | "armv7" | "aarch64" | "i386" | "amd64";
export type SupervisorObject =
  | "host"
  | "supervisor"
  | "info"
  | "core"
  | "network"
  | "resolution"
  | "os";

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
}

function processEvent(store: Store<any>, event: SupervisorEvent) {
  if (!event.data || event.data.event !== "supervisor-update") {
    return;
  }
  const state = store.state;
  if (state === undefined) {
    return;
  }

  store.setState({
    [event.data.update_key]: {
      ...state[event.data.update_key],
      ...event.data.data,
    },
  });
}

export const supervisorWsGetData = <T>(
  conn: Connection,
  endpoint: string
): Promise<T> =>
  conn.sendMessagePromise<T>({
    type: "supervisor/api",
    method: "get",
    endpoint,
  });

const subscribeSupervisorEventUpdates = (
  conn: Connection,
  store: Store<unknown>
) =>
  conn.subscribeEvents(
    (event) => processEvent(store, event as SupervisorEvent),
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
    () => supervisorWsGetData(conn, endpoint),
    subscribeSupervisorEventUpdates
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
