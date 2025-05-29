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
import type { Schema } from "js-yaml";
import yaml from "js-yaml";
import { createContext } from "@lit/context";
import type { HomeAssistant } from "../types";
import type { AutomationClipboard, ManualAutomationConfig } from "./automation";
import type { ManualScriptConfig } from "./script";
import type { Selector } from "./selector";
import { createSearchParam } from "../common/url/search-params";
import { navigate } from "../common/navigate";

export type BlueprintDomain = "automation" | "script";

export type Blueprints = Record<string, BlueprintOrError>;

export type BlueprintOrError = Blueprint | { error: string };

export interface BlueprintBase {
  blueprint?: BlueprintMetaData;
  metadata: BlueprintMetaData;
}

export interface AutomationBlueprint
  extends ManualAutomationConfig,
    BlueprintBase {}
export interface ScriptBlueprint extends ManualScriptConfig, BlueprintBase {}
export type Blueprint = AutomationBlueprint | ScriptBlueprint;

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
  blueprint: Blueprint;
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
    yamlSource,
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
  blueprint: Blueprint
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

export const showBlueprintEditor = (
  domain: BlueprintDomain,
  data?: Partial<Blueprint>,
  expanded?: boolean
) => {
  initialBlueprintEditorData = data;

  const params: Record<string, string> = {};
  if (expanded) {
    params.expanded = "1";
  }

  navigate(`/config/blueprint/edit/${domain}/new?${createSearchParam(params)}`);
};

export const getBlueprintEditorInitData = () => {
  const data = initialBlueprintEditorData;
  initialBlueprintEditorData = undefined;
  return data;
};

interface BlueprintClipboardBase {
  input?: string;
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

export const yamlSchemaContext = createContext<Schema>(Symbol("yaml-schema"));
