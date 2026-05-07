import { supportsFeatureFromAttributes } from "../../common/entity/supports-feature";
import { VacuumEntityFeature } from "../../data/vacuum";
import { MockBaseEntity } from "./base-entity";
import type { EntityAttributes } from "./types";

const TRANSITION_MS = 3000;

export class MockVacuumEntity extends MockBaseEntity {
  public async handleService(
    domain: string,
    service: string,
    data: Record<string, any>
  ): Promise<void> {
    if (domain !== this.domain) {
      return;
    }

    this._clearTransition();

    if (service === "start") {
      this.update({ state: "cleaning" });
      return;
    }

    if (service === "pause") {
      this.update({ state: "paused" });
      return;
    }

    if (service === "stop") {
      this.update({ state: "idle" });
      return;
    }

    if (service === "return_to_base") {
      this._transition("returning", "docked", TRANSITION_MS);
      return;
    }

    if (service === "clean_spot") {
      this.update({ state: "cleaning" });
      return;
    }

    if (service === "locate") {
      return;
    }

    if (service === "set_fan_speed") {
      this.update({ attributes: { fan_speed: data.fan_speed } });
      return;
    }

    super.handleService(domain, service, data);
  }

  protected _getCapabilityAttributes(): EntityAttributes {
    const attrs = this.attributes;
    const capabilityAttrs: EntityAttributes = {};

    if (supportsFeatureFromAttributes(attrs, VacuumEntityFeature.FAN_SPEED)) {
      capabilityAttrs.fan_speed_list = attrs.fan_speed_list;
    }

    return capabilityAttrs;
  }

  protected _getStateAttributes(): EntityAttributes {
    const attrs = this.attributes;

    const stateAttrs: EntityAttributes = {};

    if (supportsFeatureFromAttributes(attrs, VacuumEntityFeature.FAN_SPEED)) {
      stateAttrs.fan_speed = attrs.fan_speed ?? null;
    }

    if (supportsFeatureFromAttributes(attrs, VacuumEntityFeature.BATTERY)) {
      stateAttrs.battery_level = attrs.battery_level ?? null;
      stateAttrs.battery_icon = attrs.battery_icon ?? null;
    }

    if (supportsFeatureFromAttributes(attrs, VacuumEntityFeature.STATUS)) {
      stateAttrs.status = attrs.status ?? null;
    }

    return stateAttrs;
  }
}
