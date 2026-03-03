/**
 * Barrel file for backward compatibility.
 * All entity classes have been moved to src/fake_data/entities/.
 *
 * Consumers should continue importing from this file:
 *   import { MockBaseEntity, getEntity } from "../fake_data/entity";
 */

export { MockBaseEntity } from "./entities/base-entity";
export { getEntity } from "./entities/registry";
export type { EntityInput } from "./entities/types";
