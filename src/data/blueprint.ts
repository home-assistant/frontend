import {
  mdiAlpha,
  mdiCalendar,
  mdiCalendarClock,
  mdiChat,
  mdiClock,
  mdiCodeBraces,
  mdiCog,
  mdiCube,
  mdiDetails,
  mdiDevices,
  mdiExclamation,
  mdiFile,
  mdiFloorPlan,
  mdiFormatColorFill,
  mdiFormDropdown,
  mdiGestureDoubleTap,
  mdiGestureTap,
  mdiGlobeModel,
  mdiHeadQuestion,
  mdiLabel,
  mdiMicrophone,
  mdiNumeric,
  mdiPalette,
  mdiPin,
  mdiPlayOutline,
  mdiPuzzle,
  mdiQrcode,
  mdiShape,
  mdiSimpleIcons,
  mdiSofa,
  mdiStateMachine,
  mdiTarget,
  mdiText,
  mdiThermostat,
  mdiTimer,
  mdiToggleSwitch,
} from "@mdi/js";
import yaml from "js-yaml";
import type { HomeAssistant } from "../types";
import type { AutomationClipboard, ManualAutomationConfig } from "./automation";
import type { ManualScriptConfig } from "./script";
import type { Selector } from "./selector";

export type BlueprintDomain = "automation" | "script";

export type Blueprints = Record<string, BlueprintOrError>;

export type BlueprintOrError = ServerBlueprint | { error: string };

export interface BlueprintBase {
  blueprint: BlueprintMetaData;
}

/*
 * The server returns blueprints in a schema not consistent with the
 * documentation where the metadata is under the key "metadata" instead of
 * "blueprint". This was kept the same to not make unintentional bugs, but
 * migrating it would be a great tech debt issue!
 */
export interface ServerBlueprintBase {
  metadata: BlueprintMetaData;
}

export interface ServerAutomationBlueprint
  extends ManualAutomationConfig, ServerBlueprintBase {}
export interface ServerScriptBlueprint
  extends ManualScriptConfig, ServerBlueprintBase {}
export type ServerBlueprint = ServerAutomationBlueprint | ServerScriptBlueprint;

export interface AutomationBlueprint
  extends ManualAutomationConfig, BlueprintBase {}
export interface ScriptBlueprint extends ManualScriptConfig, BlueprintBase {}
export type Blueprint = AutomationBlueprint | ScriptBlueprint;

export interface BlueprintMetaDataEditorSchema {
  name: string;
  path: string;
  description: string;
  author: string;
  min_version: string;
}

export type BlueprintInputEntry = [
  string,
  BlueprintInput | BlueprintInputSection | null,
];

export interface BlueprintMetaData {
  domain: BlueprintDomain;
  name: string;
  input?: Record<string, BlueprintInput | BlueprintInputSection | null>;
  description?: string;
  source_url?: string;
  author?: string;
  homeassistant?: { min_version: string };
}

export interface BlueprintInput {
  name?: string;
  description?: string;
  selector?: Selector;
  default?: any;
}

export interface BlueprintInputSection {
  name?: string;
  icon?: string;
  description?: string;
  collapsed?: boolean;
  input: Record<string, BlueprintInput | null>;
}

export interface BlueprintImportResult {
  suggested_filename: string;
  raw_data: string;
  exists?: boolean;
  blueprint: ServerBlueprint;
  validation_errors: string[] | null;
}

export interface BlueprintSubstituteResults {
  automation: { substituted_config: ManualAutomationConfig };
  script: { substituted_config: ManualScriptConfig };
}

export interface BlueprintGetResult {
  yaml: string;
}

export const fetchBlueprints = (hass: HomeAssistant, domain: BlueprintDomain) =>
  hass.callWS<Blueprints>({ type: "blueprint/list", domain });

export const getBlueprint = (
  hass: HomeAssistant,
  domain: BlueprintDomain,
  path: string
) => hass.callWS<BlueprintGetResult>({ type: "blueprint/get", domain, path });

export const importBlueprint = (hass: HomeAssistant, url: string) =>
  hass.callWS<BlueprintImportResult>({ type: "blueprint/import", url });

export const saveBlueprint = (
  hass: HomeAssistant,
  domain: BlueprintDomain,
  path: string,
  yamlSource: string,
  source_url?: string,
  allow_override?: boolean
) =>
  hass.callWS({
    type: "blueprint/save",
    domain,
    path,
    yaml: yamlSource,
    source_url,
    allow_override,
  });

export const deleteBlueprint = (
  hass: HomeAssistant,
  domain: BlueprintDomain,
  path: string
) =>
  hass.callWS<BlueprintImportResult>({
    type: "blueprint/delete",
    domain,
    path,
  });

export type BlueprintSourceType = "local" | "community" | "homeassistant";

export const getBlueprintSourceType = (
  blueprint: ServerBlueprint
): BlueprintSourceType => {
  const sourceUrl = blueprint.metadata.source_url;

  if (!sourceUrl) {
    return "local";
  }
  if (sourceUrl.includes("github.com/home-assistant")) {
    return "homeassistant";
  }
  return "community";
};

export const substituteBlueprint = <
  T extends BlueprintDomain = BlueprintDomain,
>(
  hass: HomeAssistant,
  domain: T,
  path: string,
  input: Record<string, any>
) =>
  hass.callWS<BlueprintSubstituteResults[T]>({
    type: "blueprint/substitute",
    domain,
    path,
    input,
  });

let initialBlueprintEditorData: Partial<Blueprint> | undefined;

export const getBlueprintEditorInitData = () => {
  const data = initialBlueprintEditorData;
  initialBlueprintEditorData = undefined;
  return data;
};

interface BlueprintClipboardBase {
  blueprint?: Pick<BlueprintMetaData, "input">;
}
type AutomationBlueprintClipboard = BlueprintClipboardBase &
  AutomationClipboard;
export type BlueprintClipboard = AutomationBlueprintClipboard;

export const INPUT_ICONS = {
  action: mdiGestureTap,
  addOn: mdiPuzzle,
  area: mdiSofa,
  assistPipeline: mdiChat,
  attribute: mdiDetails,
  backupLocation: mdiPin,
  boolean: mdiToggleSwitch,
  colorTemperature: mdiThermostat,
  condition: mdiHeadQuestion,
  configEntry: mdiCog,
  constant: mdiExclamation,
  conversationAgent: mdiMicrophone,
  country: mdiGlobeModel,
  date: mdiCalendar,
  dateAndTime: mdiCalendarClock,
  device: mdiDevices,
  duration: mdiTimer,
  entity: mdiShape,
  file: mdiFile,
  floor: mdiFloorPlan,
  icon: mdiSimpleIcons,
  label: mdiLabel,
  language: mdiAlpha,
  location: mdiPin,
  media: mdiPlayOutline,
  number: mdiNumeric,
  object: mdiCube,
  qrCode: mdiQrcode,
  rgbColor: mdiFormatColorFill,
  select: mdiFormDropdown,
  state: mdiStateMachine,
  target: mdiTarget,
  template: mdiCodeBraces,
  text: mdiText,
  theme: mdiPalette,
  time: mdiClock,
  trigger: mdiGestureDoubleTap,
} as const;

const inputTag = new yaml.Type("!input", { kind: "scalar" });
export const BlueprintYamlSchema = yaml.DEFAULT_SCHEMA.extend([inputTag]);

export function isValidBlueprint(
  blueprint: BlueprintOrError
): blueprint is ServerBlueprint {
  return !("error" in blueprint);
}

export function isInputSection(
  input: BlueprintInput | BlueprintInputSection
): input is BlueprintInputSection {
  return "input" in input;
}

export function getContainingSection(
  input: BlueprintInputSection,
  path: string[]
): BlueprintInputSection {
  let innerInput = input;
  for (let i = 0; i < path.length - 1; i++) {
    innerInput = innerInput.input[path[i]]! as BlueprintInputSection;
  }

  return innerInput;
}

export function getInputAtPath(
  input: BlueprintInputSection,
  path: string[]
): BlueprintInput | BlueprintInputSection {
  let innerInput = input;
  for (const item of path) {
    innerInput = innerInput.input[item]! as BlueprintInputSection;
  }

  return innerInput;
}

export function normalizeBlueprint(blueprint: Blueprint): Blueprint {
  // Normalize data: ensure triggers, actions and conditions are lists
  // Happens when people copy paste their automations into the config
  for (const key of ["triggers", "conditions", "actions"]) {
    const value = blueprint[key];
    if (value && !Array.isArray(value)) {
      blueprint[key] = [value];
    }
  }

  return blueprint;
}

export const DefaultAutomationBlueprint: AutomationBlueprint = {
  blueprint: {
    name: "",
    domain: "automation",
    input: {},
  },
  triggers: [],
  conditions: [],
  actions: [],
};

export const DefaultScriptBlueprint: ScriptBlueprint = {
  blueprint: {
    name: "",
    domain: "script",
    input: {},
  },
  alias: "",
  sequence: [],
};

export const DefaultBlueprintMetadata: BlueprintMetaDataEditorSchema = {
  name: "",
  description: "",
  min_version: "",
  path: "",
  author: "",
};
