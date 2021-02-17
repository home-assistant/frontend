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

export interface SupervisorEvent {
  event: string;
  update_key?:
    | "host"
    | "supervisor"
    | "info"
    | "core"
    | "network"
    | "resolution"
    | "os";
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

function processEvent(store: Store<Supervisor>, event: SupervisorEvent) {
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

async function fetchSupervisor(conn: Connection): Promise<Supervisor> {
  const [
    host,
    supervisor,
    info,
    core,
    network,
    resolution,
    os,
  ] = await Promise.all([
    conn.sendMessagePromise<HassioHostInfo>({
      ...supervisorWSbaseCommand,
      endpoint: "/host/info",
    }),
    conn.sendMessagePromise<HassioSupervisorInfo>({
      ...supervisorWSbaseCommand,
      endpoint: "/supervisor/info",
    }),
    conn.sendMessagePromise<HassioInfo>({
      ...supervisorWSbaseCommand,
      endpoint: "/info",
    }),
    conn.sendMessagePromise<HassioHomeAssistantInfo>({
      ...supervisorWSbaseCommand,
      endpoint: "/core/info",
    }),
    conn.sendMessagePromise<NetworkInfo>({
      ...supervisorWSbaseCommand,
      endpoint: "/network/info",
    }),
    conn.sendMessagePromise<HassioResolution>({
      ...supervisorWSbaseCommand,
      endpoint: "/resolution/info",
    }),
    conn.sendMessagePromise<HassioHassOSInfo>({
      ...supervisorWSbaseCommand,
      endpoint: "/os/info",
    }),
  ]);
  return { host, supervisor, info, core, network, resolution, os };
}

const subscribeSupervisorEventUpdates = (
  conn: Connection,
  store: Store<Supervisor>
) =>
  conn.subscribeEvents(
    (event) => processEvent(store, event as SupervisorEvent),
    "supervisor_event"
  );

export const getSupervisorEventCollection = (conn: Connection) =>
  getCollection(
    conn,
    "_supervisorEvent",
    fetchSupervisor,
    subscribeSupervisorEventUpdates
  );

export const subscribeSupervisorEvents = (
  hass: HomeAssistant,
  onChange: (event) => void
) => getSupervisorEventCollection(hass.connection).subscribe(onChange);
