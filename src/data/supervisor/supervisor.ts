import type { Connection, UnsubscribeFunc } from "home-assistant-js-websocket";
import { getCollection } from "home-assistant-js-websocket";
import type { Store } from "home-assistant-js-websocket/dist/store";
import type { CallWS } from "../../types";
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

const subscribeSupervisorEvents = (
  conn: Connection,
  onEvent: (event: SupervisorEvent) => void
) =>
  conn.subscribeMessage<SupervisorEvent>(onEvent, {
    type: "supervisor/subscribe",
  });

export type SupervisorAppEvent =
  | { type: "state"; slug: string; state: AddonState }
  | {
      type: "job";
      slug: string;
      // install, uninstall, update, rebuild or restore
      operation: string;
      done: boolean;
      failed: boolean;
    };

interface SupervisorJob {
  name: string;
  reference: string | null;
  done: boolean;
  child_jobs: SupervisorJob[];
}

// Older Supervisors name the app manager jobs addon_manager_*
const appManagerOperation = (jobName: string | undefined) =>
  /^(?:addon|app)_manager_(\w+)$/.exec(jobName ?? "")?.[1];

/**
 * Parse a Supervisor event that changes the info of an app.
 */
export const parseSupervisorAppEvent = (
  event: SupervisorEvent
): SupervisorAppEvent | undefined => {
  // Supervisor sends "addon" until Core opts in to its v2 websocket API, then "app"
  if (event.event === "addon" || event.event === "app") {
    return { type: "state", slug: event.slug, state: event.state };
  }
  const job = event.event === "job" ? event.data : undefined;
  // Only manager jobs count: their child jobs share the slug, and start, stop
  // and restart jobs change nothing beyond the state events. A manager job can
  // itself be a child, for example of a backup restore.
  // The first event of a job comes before Supervisor sets its reference.
  if (!job?.reference) {
    return undefined;
  }
  const operation = appManagerOperation(job.name);
  if (!operation) {
    return undefined;
  }
  return {
    type: "job",
    slug: job.reference,
    operation,
    done: job.done === true,
    failed: job.errors?.length > 0,
  };
};

/**
 * Return the app manager operations that run now, keyed by app slug.
 */
export const fetchAppOperations = async (
  callWS: CallWS
): Promise<Record<string, string>> => {
  const { jobs } = await callWS<{ jobs: SupervisorJob[] }>({
    type: "supervisor/api",
    endpoint: "/jobs/info",
    method: "get",
  });
  const operations: Record<string, string> = {};
  const addOperations = (list: SupervisorJob[]) => {
    for (const job of list) {
      const operation = appManagerOperation(job.name);
      if (operation && job.reference && !job.done) {
        operations[job.reference] = operation;
      }
      addOperations(job.child_jobs ?? []);
    }
  };
  addOperations(jobs);
  return operations;
};

/**
 * Subscribe to Supervisor events that change app info. Events sent while the
 * connection is down are lost, so `onReconnect` runs after each reconnect.
 */
export const subscribeSupervisorAppEvents = async (
  conn: Connection,
  onEvent: (appEvent: SupervisorAppEvent) => void,
  onReconnect: () => void
): Promise<UnsubscribeFunc> => {
  const unsub = await subscribeSupervisorEvents(conn, (event) => {
    const appEvent = parseSupervisorAppEvent(event);
    if (appEvent) {
      onEvent(appEvent);
    }
  });
  const handleReady = () => onReconnect();
  conn.addEventListener("ready", handleReady);
  return () => {
    conn.removeEventListener("ready", handleReady);
    unsub();
  };
};

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
