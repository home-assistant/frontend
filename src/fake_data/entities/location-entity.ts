import { MockBaseEntity } from "./base-entity";
import type { EntityAttributes } from "./types";

const LOCATION_ATTRIBUTES = [
  "latitude",
  "longitude",
  "gps_accuracy",
  "radius",
  "passive",
  "persons",
  "editable",
  "source",
  "source_type",
  "in_zones",
];

export class MockLocationEntity extends MockBaseEntity {
  protected _getStateAttributes(): EntityAttributes {
    const stateAttrs: EntityAttributes = {};
    for (const key of LOCATION_ATTRIBUTES) {
      if (key in this.attributes) {
        stateAttrs[key] = this.attributes[key];
      }
    }
    return stateAttrs;
  }
}
