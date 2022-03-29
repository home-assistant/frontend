import { HomeAssistant } from "../types";

interface EntitySourceConfigEntry {
  source: "config_entry";
  domain: string;
  custom_component: boolean;
  config_entry: string;
}

interface EntitySourcePlatformConfig {
  source: "platform_config";
  domain: string;
  custom_component: boolean;
}

type EntitySources = Record<
  string,
  EntitySourceConfigEntry | EntitySourcePlatformConfig
>;

export const fetchEntitySources = (hass: HomeAssistant, entity_id?: string) =>
  hass.callWS<EntitySources>({
    type: "entity/source",
    entity_id,
  });
