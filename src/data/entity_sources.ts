import { timeCachePromiseFunc } from "../common/util/time-cache-function-promise";
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

export type EntitySources = Record<
  string,
  EntitySourceConfigEntry | EntitySourcePlatformConfig
>;

const fetchEntitySources = (
  hass: HomeAssistant,
  entity_id?: string
): Promise<EntitySources> =>
  hass.callWS({
    type: "entity/source",
    entity_id,
  });

export const fetchEntitySourcesWithCache = (
  hass: HomeAssistant,
  entity_id?: string
): Promise<EntitySources> =>
  entity_id
    ? fetchEntitySources(hass, entity_id)
    : timeCachePromiseFunc(
        "_entitySources",
        // cache for 30 seconds
        30000,
        fetchEntitySources,
        // We base the cache on number of states. If number of states
        // changes we force a refresh
        (hass2) => Object.keys(hass2.states).length,
        hass
      );
