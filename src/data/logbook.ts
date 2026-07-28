import type { HassEntity, UnsubscribeFunc } from "home-assistant-js-websocket";
import { DOMAINS_WITH_DYNAMIC_PICTURE } from "../common/const";
import type { TimestampStateDomain } from "../common/const";
import { computeDomain } from "../common/entity/compute_domain";
import { computeStateDomain } from "../common/entity/compute_state_domain";
import type { LocalizeFunc } from "../common/translations/localize";
import type { HomeAssistant } from "../types";
import { isNumericEntity } from "./history";

const LOGBOOK_LOCALIZE_PATH = "ui.components.logbook.messages";
export const CONTINUOUS_DOMAINS = ["counter", "proximity"];

export interface LogbookStreamMessage {
  events: LogbookEntry[];
  start_time?: number; // Start time of this historical chunk
  end_time?: number; // End time of this historical chunk
  partial?: boolean; // Indicates more historical chunks are coming
}

export interface LogbookEntry {
  // Base data
  when: number; // Python timestamp. Do *1000 to get JS timestamp.
  name: string;
  message?: string;
  entity_id?: string;
  icon?: string;
  source?: string; // The trigger source (English phrase, parsed for the cause)
  domain?: string;
  state?: string; // The state of the entity
  attributes?: { event_type?: string }; // Selected attributes the backend surfaces
  // Context data
  context_id?: string;
  context_user_id?: string;
  context_event_type?: string;
  context_domain?: string;
  context_service?: string; // Service calls only
  context_entity_id?: string;
  context_entity_id_name?: string; // Legacy, not longer sent
  context_name?: string;
  context_state?: string; // The state of the entity
  context_source?: string; // The trigger source
  context_message?: string;
}

//
// Localization mapping for all the triggers in core
// in homeassistant.components.homeassistant.triggers
//
// Keys are the bare translation keys under `ui.components.logbook`.
//
type TriggerPhraseKey =
  | "numeric_state_of"
  | "state_of"
  | "event"
  | "time_pattern"
  | "time"
  | "homeassistant_stopping"
  | "homeassistant_starting";

// Order matters: "time pattern" must be tested before "time" because the
// source phrase is matched with `startsWith`.
const triggerPhrases: Record<TriggerPhraseKey, string> = {
  numeric_state_of: "numeric state of", // number state trigger
  state_of: "state of", // state trigger
  event: "event", // event trigger
  time_pattern: "time pattern", // time trigger
  time: "time", // time trigger
  homeassistant_stopping: "Home Assistant stopping", // stop event
  homeassistant_starting: "Home Assistant starting", // start event
};

export const getLogbookDataForContext = async (
  hass: HomeAssistant,
  startDate: string,
  contextId?: string
): Promise<LogbookEntry[]> =>
  getLogbookDataFromServer(hass, startDate, undefined, undefined, contextId);

export const getLogbookEvents = (
  hass: HomeAssistant,
  startDate: string,
  endDate?: string,
  entityIds?: string[],
  contextId?: string
): Promise<LogbookEntry[]> =>
  getLogbookDataFromServer(hass, startDate, endDate, entityIds, contextId);

const getLogbookDataFromServer = (
  hass: HomeAssistant,
  startDate: string,
  endDate?: string,
  entityIds?: string[],
  contextId?: string,
  deviceIds?: string[]
): Promise<LogbookEntry[]> => {
  // If all specified filters are empty lists, we can return an empty list.
  if (
    (entityIds || deviceIds) &&
    (!entityIds || entityIds.length === 0) &&
    (!deviceIds || deviceIds.length === 0)
  ) {
    return Promise.resolve([]);
  }

  const params: any = {
    type: "logbook/get_events",
    start_time: startDate,
  };
  if (endDate) {
    params.end_time = endDate;
  }
  if (entityIds?.length) {
    params.entity_ids = entityIds;
  }
  if (deviceIds?.length) {
    params.device_ids = deviceIds;
  }
  if (contextId) {
    params.context_id = contextId;
  }
  return hass.callWS<LogbookEntry[]>(params);
};

export const subscribeLogbook = (
  hass: HomeAssistant,
  callbackFunction: (
    message: LogbookStreamMessage,
    subscriptionId: number
  ) => void,
  startDate: string,
  endDate: string,
  subscriptionId: number,
  entityIds?: string[],
  deviceIds?: string[]
): Promise<UnsubscribeFunc> => {
  // If all specified filters are empty lists, we can return an empty list.
  if (
    (entityIds || deviceIds) &&
    (!entityIds || entityIds.length === 0) &&
    (!deviceIds || deviceIds.length === 0)
  ) {
    return Promise.reject("No entities or devices");
  }
  const params: any = {
    type: "logbook/event_stream",
    start_time: startDate,
    end_time: endDate,
  };
  if (entityIds?.length) {
    params.entity_ids = entityIds;
  }
  if (deviceIds?.length) {
    params.device_ids = deviceIds;
  }
  return hass.connection.subscribeMessage<LogbookStreamMessage>(
    (message) => callbackFunction(message, subscriptionId),
    params,
    // Don't auto-resubscribe: the replay uses a stale start_time and ha-logbook
    // appends events without deduping, so it resubscribes on `ready` instead.
    { resubscribe: false }
  );
};

export const createHistoricState = (
  currentStateObj: HassEntity,
  state?: string
): HassEntity =>
  ({
    entity_id: currentStateObj.entity_id,
    state: state,
    attributes: {
      // Rebuild the historical state by copying static attributes only
      device_class: currentStateObj.attributes.device_class,
      unit_of_measurement: currentStateObj.attributes.unit_of_measurement,
      state_class: currentStateObj.attributes.state_class,
      options: currentStateObj.attributes.options,
      source_type: currentStateObj.attributes.source_type,
      has_date: currentStateObj.attributes.has_date,
      has_time: currentStateObj.attributes.has_time,
      // We do not want to use dynamic entity pictures (e.g., from media player) for the log book rendering,
      // as they would present a false state in the log (played media right now vs actual historic data).
      entity_picture_local: DOMAINS_WITH_DYNAMIC_PICTURE.has(
        computeDomain(currentStateObj.entity_id)
      )
        ? undefined
        : currentStateObj.attributes.entity_picture_local,
      entity_picture: DOMAINS_WITH_DYNAMIC_PICTURE.has(
        computeDomain(currentStateObj.entity_id)
      )
        ? undefined
        : currentStateObj.attributes.entity_picture,
    },
  }) as unknown as HassEntity;

// Localize a backend trigger `source` phrase (e.g. "state of sensor.x") by
// translating the leading phrase while keeping the entity id. The automation
// trace timeline frames it with its own "triggered by" wording, so we only
// translate the bare description here.
export const localizeTriggerSource = (
  localize: LocalizeFunc,
  source: string | null
) => {
  if (!source) {
    return "";
  }
  for (const key of Object.keys(triggerPhrases) as TriggerPhraseKey[]) {
    const phrase = triggerPhrases[key];
    if (source.startsWith(phrase)) {
      return source.replace(phrase, localize(`ui.components.logbook.${key}`));
    }
  }
  return source;
};

export type TriggerPlatform =
  | "state"
  | "numeric_state"
  | "time"
  | "time_pattern"
  | "event"
  | "homeassistant";

// Maps the English `triggerPhrases` to automation trigger platforms, so the
// feed can reuse the editor's trigger-type labels instead of dedicated strings.
const triggerPlatform: Record<TriggerPhraseKey, TriggerPlatform> = {
  numeric_state_of: "numeric_state",
  state_of: "state",
  event: "event",
  time_pattern: "time_pattern",
  time: "time",
  homeassistant_stopping: "homeassistant",
  homeassistant_starting: "homeassistant",
};

export interface ParsedTriggerSource {
  platform?: TriggerPlatform;
  entityId?: string;
}

// Best-effort parse of the backend's English trigger `source` (e.g. "numeric
// state of sensor.x", "time pattern") into a platform + triggering entity.
// Temporary bridge until the backend sends the trigger structurally.
export const parseTriggerSource = (source: string): ParsedTriggerSource => {
  for (const key of Object.keys(triggerPhrases) as TriggerPhraseKey[]) {
    const phrase = triggerPhrases[key];
    if (!source.startsWith(phrase)) {
      continue;
    }
    const rest = source.slice(phrase.length).trim();
    const entityId = /^[a-z_]+\.[a-z0-9_]+$/.test(rest) ? rest : undefined;
    return { platform: triggerPlatform[key], entityId };
  }
  return {};
};

// Short label shown instead of the bare timestamp for each timestamp-state
// domain. Typed to TIMESTAMP_STATE_DOMAINS minus datetime (a real value) and
// event (handled separately via its event type), so a new timestamp domain
// won't compile until it gets a label here.
type LogbookActionMessage =
  | "pressed"
  | "activated"
  | "scanned"
  | "updated"
  | "sent"
  | "detected"
  | "transcribed"
  | "spoke"
  | "responded"
  | "ran"
  | "command_sent";

const STATE_ACTION_MESSAGES: Record<
  Exclude<TimestampStateDomain, "datetime" | "event">,
  LogbookActionMessage
> = {
  button: "pressed",
  input_button: "pressed",
  scene: "activated",
  tag: "scanned",
  image: "updated",
  notify: "sent",
  wake_word: "detected",
  stt: "transcribed",
  tts: "spoke",
  conversation: "responded",
  ai_task: "ran",
  infrared: "command_sent",
  radio_frequency: "command_sent",
};

export const localizeStateMessage = (
  hass: HomeAssistant,
  state: string,
  stateObj: HassEntity,
  domain: string,
  attributes?: LogbookEntry["attributes"]
): string => {
  // Events show the triggered event type, falling back to a generic label when
  // the type is unknown (the timestamp state is meaningless on its own).
  if (domain === "event") {
    const eventType = attributes?.event_type;
    if (eventType != null) {
      return hass.formatEntityAttributeValue(stateObj, "event_type", eventType);
    }
    return hass.localize(`${LOGBOOK_LOCALIZE_PATH}.detected_event_no_type`);
  }
  const actionKey: LogbookActionMessage | undefined =
    STATE_ACTION_MESSAGES[domain as keyof typeof STATE_ACTION_MESSAGES];
  if (actionKey) {
    return hass.localize(`${LOGBOOK_LOCALIZE_PATH}.${actionKey}`);
  }
  // Every other domain reuses the backend state translation, so the logbook
  // speaks the same vocabulary as the rest of the UI.
  return hass.formatEntityState(stateObj, state);
};

export const filterLogbookCompatibleEntities = (entity) => {
  const domain = computeStateDomain(entity);
  const continuous =
    CONTINUOUS_DOMAINS.includes(domain) ||
    (domain === "sensor" && isNumericEntity(domain, entity, undefined));
  return !continuous;
};
