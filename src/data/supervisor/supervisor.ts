import { Connection, getCollection } from "home-assistant-js-websocket";
import { Store } from "home-assistant-js-websocket/dist/store";
import { LocalizeFunc } from "../../common/translations/localize";
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
  localize: LocalizeFunc;
}

interface SupervisorBaseAvailableUpdates {
  panel_path?: string;
  update_type?: string;
  version_latest?: string;
}

interface SupervisorAddonAvailableUpdates
  extends SupervisorBaseAvailableUpdates {
  update_type?: "addon";
  icon?: string;
  name?: string;
}

interface SupervisorCoreAvailableUpdates
  extends SupervisorBaseAvailableUpdates {
  update_type?: "core";
}

interface SupervisorOsAvailableUpdates extends SupervisorBaseAvailableUpdates {
  update_type?: "os";
}

interface SupervisorSupervisorAvailableUpdates
  extends SupervisorBaseAvailableUpdates {
  update_type?: "supervisor";
}

export type SupervisorAvailableUpdates =
  | SupervisorAddonAvailableUpdates
  | SupervisorCoreAvailableUpdates
  | SupervisorOsAvailableUpdates
  | SupervisorSupervisorAvailableUpdates;

export interface SupervisorAvailableUpdatesResponse {
  available_updates: SupervisorAvailableUpdates[];
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
  if (event.event !== "supervisor-update" || event.update_key !== key) {
    return;
  }

  if (Object.keys(event.data).length === 0) {
    const data = await supervisorApiWsRequest<any>(conn, {
      endpoint: supervisorCollection[key],
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
    ...event.data,
  });
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

/* export const fetchSupervisorAvailableUpdates = async (
  hass: HomeAssistant
): Promise<SupervisorAvailableUpdates[]> =>
  hassioApiResultExtractor<SupervisorAvailableUpdatesResponse>(
    await hass.callWS({
      type: "supervisor/api",
      endpoint: "/supervisor/available_updates",
      method: "get",
    })
  )?.available_updates;
*/

export const fetchSupervisorAvailableUpdates = async (
  _hass: HomeAssistant
): Promise<SupervisorAvailableUpdates[]> => [
  {
    panel_path: "/update-available/core",
    update_type: "core",
    version_latest: "2021.12.0b0",
  },
  {
    panel_path: "/update-available/os",
    update_type: "os",
    version_latest: "7.0rc1",
  },
  {
    panel_path: "/update-available/supervisor",
    update_type: "supervisor",
    version_latest: "2021.12.3",
  },
  {
    name: "Mosquitto broker",
    icon: "/addons/core_mosquitto/icon",
    panel_path: "/update-available/core_mosquitto",
    update_type: "addon",
    version_latest: "1.2.0",
  },
];
