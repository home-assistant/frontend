import { ContextEvent } from "@lit/context";
import type { Context, ContextCallback } from "@lit/context";
import type { HassEntities, HassEntity } from "home-assistant-js-websocket";
import type { ReactiveController, ReactiveElement } from "lit";
import type {
  HomeAssistant,
  HomeAssistantInternationalization,
} from "../../types";
import {
  entitiesContext,
  internationalizationContext,
  statesContext,
} from "../../data/context";
import type { EntityRegistryDisplayEntry } from "../../data/entity/entity_registry";
import type { LocalizeFunc } from "../translations/localize";
import { ensureArray } from "../array/ensure-array";
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

/** Reuse `previous` when every entry still references the same `HassEntity`. */
export const preserveUnchangedEntityStatesRecord = <
  T extends Record<string, HassEntity | undefined>,
>(
  previous: T | undefined,
  next: T
): T => {
  if (!previous) {
    return next;
  }
  const nextKeys = Object.keys(next);
  if (Object.keys(previous).length !== nextKeys.length) {
    return next;
  }
  for (const key of nextKeys) {
    if (previous[key] !== next[key]) {
      return next;
    }
  }
  return previous;
};

/**
 * Reactive controller that subscribes to a Lit context and assigns each
 * delivered value to a host property — WITHOUT forcing a host update on every
 * delivery.
 *
 * `@lit/context`'s built-in `ContextConsumer` calls `host.requestUpdate()`
 * unconditionally on every provider notification. For a hot context such as
 * `statesContext` (replaced on every entity state change) that means every
 * consumer runs an (often empty) update/render cycle on every unrelated state
 * change, even when the value it actually reads is unchanged.
 *
 * This controller instead leaves update scheduling to the property's own
 * setter. Combined with {@link transform}, that setter only requests an update
 * when the *selected* value changes (Lit gates `requestUpdate(key, oldValue)`
 * with `hasChanged`), so unrelated context churn no longer triggers renders.
 */
class ContextSubscriptionController<ValueType> implements ReactiveController {
  private _unsubscribe?: () => void;

  constructor(
    private readonly _host: ReactiveElement,
    private readonly _context: Context<unknown, ValueType>,
    private readonly _assign: (value: ValueType) => void
  ) {
    this._host.addController(this);
  }

  public hostConnected(): void {
    this._host.dispatchEvent(
      new ContextEvent(this._context, this._host, this._callback, true)
    );
  }

  public hostDisconnected(): void {
    this._unsubscribe?.();
    this._unsubscribe = undefined;
  }

  // Class field arrow function so the identity is stable per instance, which the
  // provider's subscription bookkeeping and `ContextRoot` deduping rely on.
  private readonly _callback: ContextCallback<ValueType> = (
    value,
    unsubscribe
  ) => {
    // A different provider answered (e.g. re-parenting); drop the stale one.
    if (this._unsubscribe && this._unsubscribe !== unsubscribe) {
      this._unsubscribe();
    }
    this._unsubscribe = unsubscribe;
    // Assign through the property setter, which decides — via `hasChanged` —
    // whether an update is actually needed. We intentionally never call
    // `host.requestUpdate()` here.
    this._assign(value);
  };
}

/**
 * Like `@consume({ subscribe: true })` from `@lit/context`, but does not force a
 * host update on every provider notification — see
 * {@link ContextSubscriptionController}. Pair with {@link transform} so an
 * update is scheduled only when the derived value actually changes.
 */
const subscribeContext =
  <ValueType>(context: Context<unknown, ValueType>) =>
  (proto: object, propertyKey: string): void => {
    (proto.constructor as unknown as typeof ReactiveElement).addInitializer(
      (host) => {
        new ContextSubscriptionController<ValueType>(
          host as ReactiveElement,
          context,
          (value) => {
            (host as unknown as Record<string, unknown>)[propertyKey] = value;
          }
        );
      }
    );
  };

const composeDecorator = <T, V>(
  context: Context<unknown, T>,
  watchKey: string | undefined,
  select: (this: unknown, value: T) => V | undefined
) => {
  const transformDec = transform<T, V | undefined>({
    transformer: function (this: unknown, value) {
      return select.call(this, value);
    },
    watch: watchKey ? [watchKey] : [],
  });
  const consumeDec = subscribeContext<T>(context);
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
 * Like {@link consumeEntityState} but for one or more entity IDs at
 * `entityIdPath` (a string or string array; wrapped with {@link ensureArray}).
 * Resolves to a record keyed by entity ID containing the currently-available
 * entities (missing entities and non-string IDs are filtered out). Returns the
 * previous record when none of the selected entities changed.
 */
export const consumeEntityStates = (config: ConsumeEntryConfig) => {
  const watchKey = config.entityIdPath[0];
  const buildRecord = function (this: unknown, states: HassEntities) {
    const ids = ensureArray(resolveAtPath(this, config.entityIdPath));
    if (!ids || !states) return undefined;
    const result: Record<string, HassEntity> = {};
    for (const id of ids) {
      if (typeof id !== "string") continue;
      const state = states[id];
      if (state !== undefined) result[id] = state;
    }
    return result;
  };

  return (proto: unknown, propertyKey: string) => {
    const key = String(propertyKey);
    const transformDec = transform<
      HassEntities,
      Record<string, HassEntity> | undefined
    >({
      transformer: function (this: unknown, states: HassEntities) {
        const next = buildRecord.call(this, states);
        if (next === undefined) {
          return undefined;
        }
        const previous = (this as Record<string, unknown>)[
          `__transform_${key}`
        ] as Record<string, HassEntity> | undefined;
        return preserveUnchangedEntityStatesRecord(previous, next);
      },
      watch: watchKey ? [watchKey] : [],
    });
    const consumeDec = subscribeContext<HassEntities>(statesContext);
    transformDec(proto as never, propertyKey);
    consumeDec(proto as never, propertyKey);
  };
};

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

/**
 * Consumes `internationalizationContext` and narrows it to the `localize`
 * function. No host watching is needed — the decorated property updates
 * whenever `localize` changes.
 */
export const consumeLocalize = () =>
  composeDecorator<HomeAssistantInternationalization, LocalizeFunc>(
    internationalizationContext,
    undefined,
    ({ localize }) => localize
  );
