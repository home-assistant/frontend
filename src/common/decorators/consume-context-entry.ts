import { consume } from "@lit/context";
import type { HassEntities, HassEntity } from "home-assistant-js-websocket";
import type { HomeAssistant } from "../../types";
import { entitiesContext, statesContext } from "../../data/context";
import type { EntityRegistryDisplayEntry } from "../../data/entity/entity_registry";
import { transform } from "./transform";

interface ConsumeEntryConfig {
  entityIdPath: readonly string[];
}

const resolveAtPath = (host: unknown, path: readonly string[]) => {
  let cur: any = host;
  for (const seg of path) {
    if (cur == null) return undefined;
    cur = cur[seg];
  }
  return cur;
};

const composeDecorator = <T, V>(
  context: Parameters<typeof consume>[0]["context"],
  watchKey: string | undefined,
  select: (this: unknown, value: T) => V | undefined
) => {
  const transformDec = transform<T, V | undefined>({
    transformer: function (this: unknown, value) {
      return select.call(this, value);
    },
    watch: watchKey ? [watchKey] : [],
  });
  const consumeDec = consume<any>({ context, subscribe: true });
  return (proto: any, propertyKey: string) => {
    transformDec(proto, propertyKey);
    consumeDec(proto, propertyKey);
  };
};

/**
 * Consumes `statesContext` and narrows it to the `HassEntity` for the entity
 * ID found at `entityIdPath` on the host (e.g. `["_config", "entity"]`).
 *
 * The first path segment is watched on the host — changes to it re-run the
 * lookup. Deeper segments are traversed at lookup time and short-circuit on
 * nullish values.
 */
export const consumeEntityState = (config: ConsumeEntryConfig) =>
  composeDecorator<HassEntities, HassEntity>(
    statesContext,
    config.entityIdPath[0],
    function (states) {
      const id = resolveAtPath(this, config.entityIdPath);
      return typeof id === "string" ? states?.[id] : undefined;
    }
  );

/**
 * Like {@link consumeEntityState} but for an array of entity IDs at
 * `entityIdPath`. Resolves to a `HassEntity[]` containing one entry per
 * currently-available entity (missing entities and non-string IDs are
 * filtered out; original order is preserved).
 */
export const consumeEntityStates = (config: ConsumeEntryConfig) =>
  composeDecorator<HassEntities, HassEntity[]>(
    statesContext,
    config.entityIdPath[0],
    function (states) {
      const ids = resolveAtPath(this, config.entityIdPath);
      if (!Array.isArray(ids) || !states) return undefined;
      const result: HassEntity[] = [];
      for (const id of ids) {
        if (typeof id !== "string") continue;
        const state = states[id];
        if (state !== undefined) result.push(state);
      }
      return result;
    }
  );

/**
 * Consumes `entitiesContext` and narrows it to the
 * `EntityRegistryDisplayEntry` for the entity ID found at `entityIdPath` on
 * the host. See {@link consumeEntityState} for semantics.
 */
export const consumeEntityRegistryEntry = (config: ConsumeEntryConfig) =>
  composeDecorator<HomeAssistant["entities"], EntityRegistryDisplayEntry>(
    entitiesContext,
    config.entityIdPath[0],
    function (entities) {
      const id = resolveAtPath(this, config.entityIdPath);
      return typeof id === "string" ? entities?.[id] : undefined;
    }
  );
