import type {
  HassEntity,
  HassEntityAttributeBase,
} from "home-assistant-js-websocket";

/** Base attributes type that all entities share */
export type EntityAttributes = HassEntityAttributeBase & Record<string, any>;

/** Input for creating a mock entity — only the essential HassEntity fields */
export type EntityInput = Pick<
  HassEntity,
  "entity_id" | "state" | "attributes"
>;

/**
 * The hass mock object interface, kept intentionally loose
 * to avoid a circular dependency with provide_hass.ts.
 */
export interface MockHassLike {
  mockEntities: Record<string, any>;
  updateStates(newStates: Record<string, HassEntity>): void;
}
