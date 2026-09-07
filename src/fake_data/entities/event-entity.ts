import { MockBaseEntity } from "./base-entity";
import type { EntityAttributes } from "./types";

export class MockEventEntity extends MockBaseEntity {
  protected _getCapabilityAttributes(): EntityAttributes {
    return { event_types: this.attributes.event_types ?? [] };
  }

  protected _getStateAttributes(): EntityAttributes {
    return { event_type: this.attributes.event_type ?? null };
  }
}
