import { HomeAssistant } from "../types";
import { ManualAutomationConfig } from "./automation";
import { ManualScriptConfig } from "./script";
import { Selector } from "./selector";

export type BlueprintDomain = "automation" | "script";

export type Blueprints = Record<string, BlueprintOrError>;

export type BlueprintOrError = Blueprint | { error: string };
export interface Blueprint {
  metadata: BlueprintMetaData;
}

export interface BlueprintMetaData {
  domain: BlueprintDomain;
  name: string;
  input?: Record<string, BlueprintInput | BlueprintInputSection | null>;
  description?: string;
  source_url?: string;
  author?: string;
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

export const fetchBlueprints = (hass: HomeAssistant, domain: BlueprintDomain) =>
  hass.callWS<Blueprints>({ type: "blueprint/list", domain });

export const importBlueprint = (hass: HomeAssistant, url: string) =>
  hass.callWS<BlueprintImportResult>({ type: "blueprint/import", url });

export const saveBlueprint = (
  hass: HomeAssistant,
  domain: BlueprintDomain,
  path: string,
  yaml: string,
  source_url?: string,
  allow_override?: boolean
) =>
  hass.callWS({
    type: "blueprint/save",
    domain,
    path,
    yaml,
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
