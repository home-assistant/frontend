import { consume } from "@lit/context";
import type { HassEntities, HassEntity } from "home-assistant-js-websocket";
import type { HomeAssistant } from "../../types";
import { entitiesContext, statesContext } from "../../data/context";
import type { EntityRegistryDisplayEntry } from "../../data/entity/entity_registry";
import { transform } from "./transform";

interface ConsumeEntryConfig {
  entityId: readonly string[];
}

const resolveEntityId = (host: unknown, path: readonly string[]) => {
  let cur: any = host;
  for (const seg of path) {
    if (cur == null) return undefined;
    cur = cur[seg];
  }
  return typeof cur === "string" ? cur : undefined;
};

const composeContextEntryDecorators = <T, V>(
  context: Parameters<typeof consume>[0]["context"],
  config: ConsumeEntryConfig,
  pick: (value: T, id: string) => V | undefined
) => {
  const watchKey = config.entityId[0];
  const transformDec = transform<T, V | undefined>({
    transformer: function (this: unknown, value) {
      const id = resolveEntityId(this, config.entityId);
      return id !== undefined ? pick(value, id) : undefined;
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
 * ID found at `entityId` on the host (e.g. `["_config", "entity"]`).
 *
 * The first path segment is watched on the host — changes to it re-run the
 * lookup. Deeper segments are traversed at lookup time and short-circuit on
 * nullish values.
 */
export const consumeStateObj = (config: ConsumeEntryConfig) =>
  composeContextEntryDecorators<HassEntities, HassEntity>(
    statesContext,
    config,
    (states, id) => states?.[id]
  );

/**
 * Consumes `entitiesContext` and narrows it to the
 * `EntityRegistryDisplayEntry` for the entity ID found at `entityId` on the
 * host. See {@link consumeStateObj} for semantics.
 */
export const consumeEntityRegistryEntry = (config: ConsumeEntryConfig) =>
  composeContextEntryDecorators<
    HomeAssistant["entities"],
    EntityRegistryDisplayEntry
  >(entitiesContext, config, (entities, id) => entities?.[id]);
