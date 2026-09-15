import { ensureArray } from "../common/array/ensure-array";
import { isValidEntityId } from "../common/entity/valid_entity_id";
import type { Context, HomeAssistant, ServiceCallRequest } from "../types";
import type { Action } from "./script";

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
