import { Connection, getCollection } from "home-assistant-js-websocket";
import { HomeAssistant } from "../../types";
import { HassioHassOSInfo, HassioHostInfo } from "../hassio/host";
import { NetworkInfo } from "../hassio/network";
import { HassioResolution } from "../hassio/resolution";
import {
  HassioHomeAssistantInfo,
  HassioInfo,
  HassioSupervisorInfo,
} from "../hassio/supervisor";

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

const subscribeSupervisorEventUpdates = (conn: Connection, store) =>
  conn.subscribeEvents(
    (event) => store.setState(event, true),
    "supervisor_event"
  );

const getSupervisorEventCollection = (conn: Connection) =>
  getCollection(
    conn,
    "_supervisorEvent",
    async () => {
      return null;
    },
    subscribeSupervisorEventUpdates
  );

export const subscribeSupervisorEvents = (
  hass: HomeAssistant,
  onChange: (event) => void
) => getSupervisorEventCollection(hass.connection).subscribe(onChange);
