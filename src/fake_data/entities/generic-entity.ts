import { MockBaseEntity } from "./base-entity";
import type { EntityAttributes } from "./types";

/**
 * Entity for domains without their own mock, such as sensor, weather and
 * calendar. Keeps all its attributes, as nothing here computes them.
 */
export class MockGenericEntity extends MockBaseEntity {
  protected _getStateAttributes(): EntityAttributes {
    return this.attributes;
  }
}
