import { timeCachePromiseFunc } from "../common/util/time-cache-function-promise";
import { HomeAssistant } from "../types";

interface EntitySource {
  domain: string;
}

export type EntitySources = Record<string, EntitySource>;

const fetchEntitySources = (hass: HomeAssistant): Promise<EntitySources> =>
  hass.callWS({ type: "entity/source" });

export const fetchEntitySourcesWithCache = (
  hass: HomeAssistant
): Promise<EntitySources> =>
  timeCachePromiseFunc(
    "_entitySources",
    // cache for 30 seconds
    30000,
    fetchEntitySources,
    // We base the cache on number of states. If number of states
    // changes we force a refresh
    (hass2) => Object.keys(hass2.states).length,
    hass
  );
