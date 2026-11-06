import type { HassEntities } from "home-assistant-js-websocket";
import { timeCachePromiseFunc } from "../../common/util/time-cache-function-promise";
import type { HomeAssistant } from "../../types";

interface EntitySource {
  domain: string;
}

export type EntitySources = Record<string, EntitySource>;

const caches = new WeakMap<HomeAssistant["callWS"], Record<string, unknown>>();

export const fetchEntitySourcesWithCache = (
  callWS: HomeAssistant["callWS"],
  states: HassEntities
): Promise<EntitySources> => {
  let cache = caches.get(callWS);
  if (!cache) {
    cache = {};
    caches.set(callWS, cache);
  }
  return timeCachePromiseFunc(
    "_entitySources",
    // cache for 30 seconds
    30000,
    () => callWS<EntitySources>({ type: "entity/source" }),
    // We base the cache on number of states. If number of states
    // changes we force a refresh
    () => Object.keys(states).length,
    cache
  );
};
