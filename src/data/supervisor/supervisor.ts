import { Connection, getCollection } from "home-assistant-js-websocket";
import { Store } from "home-assistant-js-websocket/dist/store";
import {
  FlattenObjectKeys,
  LocalizeFunc,
} from "../../common/translations/localize";
import { TranslationDict } from "../../types";
import { HassioAddonsInfo } from "../hassio/addon";
import { HassioHassOSInfo, HassioHostInfo } from "../hassio/host";
import { NetworkInfo } from "../hassio/network";
import { HassioResolution } from "../hassio/resolution";
import {
  HassioHomeAssistantInfo,
  HassioInfo,
  HassioSupervisorInfo,
} from "../hassio/supervisor";
import { SupervisorStore } from "./store";

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

interface supervisorApiRequest {
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

export type SupervisorKeys = FlattenObjectKeys<TranslationDict["supervisor"]>;

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
  localize: LocalizeFunc<SupervisorKeys>;
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

const subscribeSupervisorEventUpdates = (
  conn: Connection,
  store: Store<unknown>,
  key: string
) =>
  conn.subscribeMessage(
    (event) => processEvent(conn, store, event as SupervisorEvent, key),
    {
      type: "supervisor/subscribe",
    }
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
