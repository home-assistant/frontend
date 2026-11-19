import type { Connection, UnsubscribeFunc } from "home-assistant-js-websocket";
import {
  getCollection,
  subscribeServices as subscribeRegisteredServices,
} from "home-assistant-js-websocket";
import type { Store } from "home-assistant-js-websocket/dist/store";
import { atLeastVersion } from "../common/config/version";
import type { HassServices } from "./service";

interface ServicesEvent {
  services?: HassServices;
  removed?: Record<string, string[]>;
}

/** Apply a services/subscribe event; the first event of a subscription has no current state. */
export const applyServicesEvent = (
  current: HassServices | undefined,
  event: ServicesEvent
): HassServices => {
  const services: HassServices = { ...current };
  for (const [domain, changed] of Object.entries(event.services ?? {})) {
    services[domain] = { ...services[domain], ...changed };
  }
  for (const [domain, removed] of Object.entries(event.removed ?? {})) {
    if (!services[domain]) {
      continue;
    }
    const domainServices = { ...services[domain] };
    for (const service of removed) {
      delete domainServices[service];
    }
    if (Object.keys(domainServices).length) {
      services[domain] = domainServices;
    } else {
      delete services[domain];
    }
  }
  return services;
};

const subscribeServicesUpdates = (
  conn: Connection,
  store: Store<HassServices>
): Promise<UnsubscribeFunc> => {
  // The subscription is re-established after a reconnect and then starts
  // over with the full set.
  let initial = true;
  const reset = () => {
    initial = true;
  };
  conn.addEventListener("disconnected", reset);
  return conn
    .subscribeMessage<ServicesEvent>(
      (event) => {
        store.setState(
          applyServicesEvent(initial ? undefined : store.state, event),
          true
        );
        initial = false;
      },
      { type: "services/subscribe" }
    )
    .then((unsub) => () => {
      conn.removeEventListener("disconnected", reset);
      unsub();
    });
};

export const subscribeServices = (
  conn: Connection,
  onChange: (services: HassServices) => void
) =>
  // For Cast, old instances can connect to it.
  __BACKWARDS_COMPAT__ && !atLeastVersion(conn.haVersion, 2026, 12)
    ? subscribeRegisteredServices(conn, onChange)
    : getCollection<HassServices>(
        conn,
        "_services",
        undefined,
        subscribeServicesUpdates
      ).subscribe(onChange);
