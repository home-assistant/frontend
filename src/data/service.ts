import type { HassService } from "home-assistant-js-websocket";
import { ensureArray } from "../common/array/ensure-array";
import { isValidEntityId } from "../common/entity/valid_entity_id";
import { combineVisible } from "../components/ha-form/conditions";
import type { HaFormVisible } from "../components/ha-form/types";
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

interface ServiceFieldOrSection {
  visible?: HaFormVisible;
  fields?: Record<string, { visible?: HaFormVisible }>;
}

// Fields inside a section are flattened, they are only shown when both the
// section and the field are visible.
export const getServiceFieldVisibility = (
  fields: HassService["fields"]
): [string, HaFormVisible | undefined][] =>
  Object.entries(fields as Record<string, ServiceFieldOrSection>).flatMap(
    ([key, field]) =>
      field.fields
        ? Object.entries(field.fields).map(
            ([subKey, subField]) =>
              [subKey, combineVisible(field.visible, subField.visible)] as [
                string,
                HaFormVisible,
              ]
          )
        : [[key, field.visible] as [string, HaFormVisible | undefined]]
  );
