import { createContext } from "@lit/context";

/**
 * Entity context provided by an enclosing card/badge to condition editors.
 *
 * Lets a condition editor know what entity (or entities) it is being edited
 * against, so it can offer sensible defaults and autocomplete without forcing
 * the user to re-pick entities already configured on the host card.
 *
 * Two modes:
 *
 * - `"current"`: the host has a single primary entity (e.g. a Tile card for
 *   `sensor.kitchen_temp`). Condition editors show a "Current entity" toggle
 *   and, when selected, let the runtime fall back to this entity via
 *   `ConditionContext.entity_id`.
 *
 * - `"filter"`: the host applies conditions per-entity over a list (e.g. the
 *   Map card). The entity picker is hidden, and state autocomplete is scoped
 *   to the listed entities. Each condition is stamped with a concrete entity
 *   at runtime via `addEntityToCondition`.
 */
export type ConditionsEntityContext =
  | { mode: "current"; entityId: string }
  | { mode: "filter"; entityIds: string[] };

export const conditionsEntityContext = createContext<
  ConditionsEntityContext | undefined
>("conditions-entity-context");
