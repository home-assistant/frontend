import {
  HassEntityAttributeBase,
  HassEntityBase,
  HassServiceTarget,
} from "home-assistant-js-websocket";
import { computeObjectId } from "../common/entity/compute_object_id";
import { navigate } from "../common/navigate";
import { LocalizeFunc } from "../common/translations/localize";
import { HomeAssistant } from "../types";
import { Condition, Trigger } from "./automation";

export const MODES = ["single", "restart", "queued", "parallel"] as const;
export const MODES_MAX = ["queued", "parallel"];

export interface ScriptEntity extends HassEntityBase {
  attributes: HassEntityAttributeBase & {
    last_triggered: string;
    mode: typeof MODES[number];
    current?: number;
    max?: number;
  };
}

export interface ScriptConfig {
  alias: string;
  sequence: Action[];
  icon?: string;
  mode?: typeof MODES[number];
  max?: number;
}

export interface EventAction {
  alias?: string;
  event: string;
  event_data?: Record<string, any>;
  event_data_template?: Record<string, any>;
}

export interface ServiceAction {
  alias?: string;
  service: string;
  entity_id?: string;
  target?: HassServiceTarget;
  data?: Record<string, any>;
}

export interface DeviceAction {
  alias?: string;
  device_id: string;
  domain: string;
  entity_id: string;
}

export interface DelayActionParts {
  milliseconds?: number;
  seconds?: number;
  minutes?: number;
  hours?: number;
  days?: number;
}
export interface DelayAction {
  alias?: string;
  delay: number | Partial<DelayActionParts> | string;
}

export interface SceneAction {
  alias?: string;
  scene: string;
}

export interface WaitAction {
  alias?: string;
  wait_template: string;
  timeout?: number;
  continue_on_timeout?: boolean;
}

export interface WaitForTriggerAction {
  alias?: string;
  wait_for_trigger: Trigger[];
  timeout?: number;
  continue_on_timeout?: boolean;
}

export interface RepeatAction {
  alias?: string;
  repeat: CountRepeat | WhileRepeat | UntilRepeat;
}

interface BaseRepeat {
  sequence: Action[];
}

export interface CountRepeat extends BaseRepeat {
  count: number;
}

export interface WhileRepeat extends BaseRepeat {
  while: Condition[];
}

export interface UntilRepeat extends BaseRepeat {
  until: Condition[];
}

export interface ChooseAction {
  alias?: string;
  choose: [{ conditions: Condition[]; sequence: Action[] }];
  default?: Action[];
}

export type Action =
  | EventAction
  | DeviceAction
  | ServiceAction
  | Condition
  | DelayAction
  | SceneAction
  | WaitAction
  | WaitForTriggerAction
  | RepeatAction
  | ChooseAction;

export const triggerScript = (
  hass: HomeAssistant,
  entityId: string,
  variables?: Record<string, unknown>
) => hass.callService("script", computeObjectId(entityId), variables);

export const canRun = (state: ScriptEntity) => {
  if (state.state === "off") {
    return true;
  }
  if (
    state.state === "on" &&
    MODES_MAX.includes(state.attributes.mode) &&
    state.attributes.current! < state.attributes.max!
  ) {
    return true;
  }
  return false;
};

export const deleteScript = (hass: HomeAssistant, objectId: string) =>
  hass.callApi("DELETE", `config/script/config/${objectId}`);

let inititialScriptEditorData: Partial<ScriptConfig> | undefined;

export const showScriptEditor = (
  el: HTMLElement,
  data?: Partial<ScriptConfig>
) => {
  inititialScriptEditorData = data;
  navigate(el, "/config/script/edit/new");
};

export const getScriptEditorInitData = () => {
  const data = inititialScriptEditorData;
  inititialScriptEditorData = undefined;
  return data;
};

export const describeAction = (action: Action, _localize: LocalizeFunc) => {
  // Check based on config_validation.py#determine_script_action
  if ("delay" in action) {
    return "Delay";
  }
  if ("wait_template" in action) {
    return "Wait";
  }
  if ("condition" in action) {
    return "Check condition";
  }
  if ("event" in action) {
    return "Fire event";
  }
  if ("device_id" in action) {
    return "Run Device Action";
  }
  if ("scene" in action) {
    return "Activate a scene";
  }
  if ("repeat" in action) {
    return "Repeat an action multiple times";
  }
  if ("choose" in action) {
    return "Choose an action";
  }
  if ("wait_for_trigger" in action) {
    return "Wait for a trigger";
  }
  if ("variables" in action) {
    return "Define variables";
  }
  if ("service" in action) {
    return "Call service";
  }
  return "Unknown action";
};
