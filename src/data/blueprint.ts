import { HomeAssistant } from "../types";

export type Blueprints = Record<string, Blueprint>;

export interface Blueprint {
  metadata: BlueprintMetaData;
}

export interface BlueprintMetaData {
  domain: string;
  name: string;
  input: BlueprintInput;
}

export type BlueprintInput = Record<string, any>;

export interface BlueprintImportResult {
  url: string;
  suggested_filename: string;
  raw_data: string;
  blueprint: Blueprint;
}

export const fetchBlueprints = (hass: HomeAssistant, domain: string) =>
  hass.callWS<Blueprints>({ type: "blueprint/list", domain });

export const importBlueprint = (hass: HomeAssistant, url: string) =>
  hass.callWS<BlueprintImportResult>({ type: "blueprint/import", url });

export const saveBlueprint = (
  hass: HomeAssistant,
  domain: string,
  path: string,
  yaml: string,
  source_url?: string
) =>
  hass.callWS({
    type: "blueprint/save",
    domain,
    path,
    yaml,
    source_url,
  });

export const deleteBlueprint = (
  hass: HomeAssistant,
  domain: string,
  path: string
) =>
  hass.callWS<BlueprintImportResult>({
    type: "blueprint/delete",
    domain,
    path,
  });
