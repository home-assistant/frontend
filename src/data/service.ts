import type {
  Connection,
  HassService as HassServiceBase,
  UnsubscribeFunc,
} from "home-assistant-js-websocket";
import { getCollection } from "home-assistant-js-websocket";
import type { Store } from "home-assistant-js-websocket/dist/store";
import { ensureArray } from "../common/array/ensure-array";
import { isValidEntityId } from "../common/entity/valid_entity_id";
import type { LocalizeValues } from "../common/translations/localize";
import { UNKNOWN_PLACEHOLDERS } from "../common/translations/localize";
import type { Context, HomeAssistant, ServiceCallRequest } from "../types";
import type { Action } from "./script";

// Core also describes services from an integration's services.yaml before
// the integration registers them. Until then `null` marks the values that
// only registration provides.
export interface HassService extends Omit<
  HassServiceBase,
  "response" | "description_placeholders"
> {
  response?: { optional: boolean } | null;
  description_placeholders?: Record<string, string> | null;
}

export type HassDomainServices = Record<string, HassService>;

export type HassServices = Record<string, HassDomainServices>;

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
  getCollection<HassServices>(
    conn,
    "_services",
    undefined,
    subscribeServicesUpdates
  ).subscribe(onChange);

export type ServiceResponseVariableMode = "hidden" | "optional" | "required";

/** How the editor offers the response variable; a kept variable of a not yet registered service stays editable. */
export const getServiceResponseVariableMode = (
  service: HassService | undefined,
  hasResponseVariable: boolean
): ServiceResponseVariableMode => {
  const response = service?.response;
  if (response === null) {
    return hasResponseVariable ? "optional" : "hidden";
  }
  if (!response) {
    return "hidden";
  }
  return response.optional ? "optional" : "required";
};

/** Whether a response variable is meaningless for this service. */
export const serviceRejectsResponseVariable = (
  service: HassService | undefined
) => !!service && service.response === undefined;

/** Placeholders for localizing a service's texts. */
export const getServicePlaceholders = (
  service: HassService | undefined
): LocalizeValues | undefined =>
  service?.description_placeholders === null
    ? UNKNOWN_PLACEHOLDERS
    : service?.description_placeholders;

export const callExecuteScript = (
  hass: HomeAssistant,
  sequence: Action | Action[]
): Promise<{ context: Context; response: Record<string, any> | null }> =>
  hass.callWS({
    type: "execute_script",
    sequence,
  });

export const serviceCallWillDisconnect = (
  domain: string,
  service: string,
  serviceData?: Record<string, any>
) =>
  (domain === "homeassistant" && ["restart", "stop"].includes(service)) ||
  (domain === "update" &&
    service === "install" &&
    [
      "update.home_assistant_core_update",
      "update.home_assistant_operating_system_update",
    ].includes(serviceData?.entity_id));

// Core merges the target into the service data, so a target entity_id
// replaces the legacy service data one rather than adding to it. Its schema
// also accepts comma separated ids and lowercases them.
export const getServiceCallEntityIds = (
  serviceData?: ServiceCallRequest["serviceData"],
  target?: ServiceCallRequest["target"]
): string[] => [
  ...new Set(
    (ensureArray(target?.entity_id ?? serviceData?.entity_id) ?? [])
      .filter((id): id is string => typeof id === "string")
      .flatMap((id) => id.split(","))
      .map((id) => id.trim().toLowerCase())
      .filter(isValidEntityId)
  ),
];
