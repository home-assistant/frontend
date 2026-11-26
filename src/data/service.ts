import type { HassService } from "home-assistant-js-websocket";
import { ensureArray } from "../common/array/ensure-array";
import { hasTemplate } from "../common/string/has-template";
import { isValidEntityId } from "../common/entity/valid_entity_id";
import {
  combineVisible,
  getHiddenFields,
} from "../components/ha-form/conditions";
import type {
  HaFormDataContainer,
  HaFormVisible,
} from "../components/ha-form/types";
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
  default?: unknown;
  fields?: Record<string, { visible?: HaFormVisible; default?: unknown }>;
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

export const getServiceFieldDefaults = (
  fields: HassService["fields"]
): HaFormDataContainer => {
  const defaults: HaFormDataContainer = {};
  for (const [key, field] of Object.entries(
    fields as Record<string, ServiceFieldOrSection>
  )) {
    const entries = field.fields
      ? Object.entries(field.fields)
      : [[key, field]];
    for (const [fieldKey, subField] of entries as [
      string,
      { default?: HaFormDataContainer[string] },
    ][]) {
      if (subField.default !== undefined) {
        defaults[fieldKey] = subField.default;
      }
    }
  }
  return defaults;
};

const getConditionFields = (visible: HaFormVisible | undefined): string[] =>
  visible === undefined || typeof visible === "boolean"
    ? []
    : ensureArray(visible).flatMap((condition) =>
        "condition" in condition
          ? condition.conditions.flatMap((sub) => getConditionFields(sub))
          : [condition.field]
      );

// Like in config flows and blueprints, a field without a value is evaluated
// with its default. A template is only known when the action runs, so a
// condition on a field holding one never hides anything.
export const getServiceHiddenFields = (
  visibility: [string, HaFormVisible | undefined][],
  defaults: HaFormDataContainer,
  data: Record<string, any> | undefined
): Set<string> => {
  const values = { ...defaults };
  const templates = new Set<string>();
  for (const [key, value] of Object.entries(data ?? {})) {
    if (value !== undefined) {
      values[key] = value;
    }
    if (hasTemplate(value)) {
      templates.add(key);
    }
  }
  return getHiddenFields(
    visibility.map(([key, visible]) => [
      key,
      visible === undefined || typeof visible === "boolean"
        ? visible
        : ensureArray(visible).filter(
            (condition) =>
              !getConditionFields(condition).some((field) =>
                templates.has(field)
              )
          ),
    ]),
    values
  );
};
