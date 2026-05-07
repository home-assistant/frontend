import { supportsFeatureFromAttributes } from "../../common/entity/supports-feature";
import { FanEntityFeature } from "../../data/fan";
import { MockBaseEntity } from "./base-entity";
import type { EntityAttributes } from "./types";

export class MockFanEntity extends MockBaseEntity {
  public async handleService(
    domain: string,
    service: string,
    data: Record<string, any>
  ): Promise<void> {
    if (!["homeassistant", this.domain].includes(domain)) {
      return;
    }

    if (service === "turn_on") {
      const attrs: EntityAttributes = {};
      if (data.percentage !== undefined) {
        attrs.percentage = data.percentage;
      }
      if (data.preset_mode !== undefined) {
        attrs.preset_mode = data.preset_mode;
      }
      this.update({ state: "on", attributes: attrs });
      return;
    }

    if (service === "turn_off") {
      this.update({ state: "off" });
      return;
    }

    if (service === "toggle") {
      if (this.state === "on") {
        this.handleService(domain, "turn_off", data);
      } else {
        this.handleService(domain, "turn_on", data);
      }
      return;
    }

    if (service === "set_percentage") {
      const isOn = data.percentage > 0;
      this.update({
        state: isOn ? "on" : "off",
        attributes: { percentage: data.percentage },
      });
      return;
    }

    if (service === "set_preset_mode") {
      this.update({
        state: "on",
        attributes: { preset_mode: data.preset_mode },
      });
      return;
    }

    if (service === "set_direction") {
      this.update({ attributes: { direction: data.direction } });
      return;
    }

    if (service === "oscillate") {
      this.update({ attributes: { oscillating: data.oscillating } });
      return;
    }

    super.handleService(domain, service, data);
  }

  protected _getCapabilityAttributes(): EntityAttributes {
    const attrs = this.attributes;
    const capabilityAttrs: EntityAttributes = {};

    if (
      supportsFeatureFromAttributes(attrs, FanEntityFeature.SET_SPEED) &&
      attrs.percentage_step !== undefined
    ) {
      capabilityAttrs.percentage_step = attrs.percentage_step;
    }

    if (supportsFeatureFromAttributes(attrs, FanEntityFeature.PRESET_MODE)) {
      capabilityAttrs.preset_modes = attrs.preset_modes;
    }

    return capabilityAttrs;
  }

  protected _getStateAttributes(): EntityAttributes {
    const attrs = this.attributes;
    const isOff = this.state === "off";

    const stateAttrs: EntityAttributes = {};

    if (supportsFeatureFromAttributes(attrs, FanEntityFeature.SET_SPEED)) {
      stateAttrs.percentage = isOff ? null : (attrs.percentage ?? null);
    }

    if (supportsFeatureFromAttributes(attrs, FanEntityFeature.OSCILLATE)) {
      stateAttrs.oscillating = isOff ? null : (attrs.oscillating ?? null);
    }

    if (supportsFeatureFromAttributes(attrs, FanEntityFeature.DIRECTION)) {
      stateAttrs.direction = isOff ? null : (attrs.direction ?? null);
    }

    if (supportsFeatureFromAttributes(attrs, FanEntityFeature.PRESET_MODE)) {
      stateAttrs.preset_mode = isOff ? null : (attrs.preset_mode ?? null);
    }

    return stateAttrs;
  }
}
