import { supportsFeatureFromAttributes } from "../../common/entity/supports-feature";
import {
  HUMIDIFIER_ACTION_MODE,
  HumidifierEntityDeviceClass,
  HumidifierEntityFeature,
} from "../../data/humidifier";
import type { HumidifierAction } from "../../data/humidifier";
import { MockBaseEntity } from "./base-entity";
import type { EntityAttributes } from "./types";

export class MockHumidifierEntity extends MockBaseEntity {
  public async handleService(
    domain: string,
    service: string,
    data: Record<string, any>
  ): Promise<void> {
    if (!["homeassistant", this.domain].includes(domain)) {
      return;
    }

    if (service === "turn_on") {
      this.update({ state: "on" });
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

    if (service === "set_humidity") {
      this.update({ attributes: { humidity: data.humidity } });
      return;
    }

    if (service === "set_mode") {
      this.update({ attributes: { mode: data.mode } });
      return;
    }

    super.handleService(domain, service, data);
  }

  protected _getCapabilityAttributes(): EntityAttributes {
    const attrs = this.attributes;
    const capabilityAttrs: EntityAttributes = {};

    if (attrs.min_humidity !== undefined) {
      capabilityAttrs.min_humidity = attrs.min_humidity;
    }
    if (attrs.max_humidity !== undefined) {
      capabilityAttrs.max_humidity = attrs.max_humidity;
    }
    if (attrs.target_humidity_step !== undefined) {
      capabilityAttrs.target_humidity_step = attrs.target_humidity_step;
    }

    if (supportsFeatureFromAttributes(attrs, HumidifierEntityFeature.MODES)) {
      capabilityAttrs.available_modes = attrs.available_modes;
    }

    return capabilityAttrs;
  }

  protected _getStateAttributes(): EntityAttributes {
    const attrs = this.attributes;
    const isOff = this.state === "off";

    const stateAttrs: EntityAttributes = {
      current_humidity: attrs.current_humidity ?? null,
      humidity: isOff ? null : (attrs.humidity ?? null),
      action: isOff ? "off" : this._computeAction(),
    };

    if (supportsFeatureFromAttributes(attrs, HumidifierEntityFeature.MODES)) {
      stateAttrs.mode = isOff ? null : (attrs.mode ?? null);
    }

    return stateAttrs;
  }

  private _computeAction(): HumidifierAction {
    const attrs = this.attributes;
    const deviceClass = attrs.device_class;
    const current = attrs.current_humidity;
    const target = attrs.humidity;

    if (current != null && target != null) {
      if (deviceClass === HumidifierEntityDeviceClass.DEHUMIDIFIER) {
        return current > target ? "drying" : "idle";
      }
      return current < target ? "humidifying" : "idle";
    }

    // Derive from action → mode mapping if we can't compute
    const action = attrs.action;
    if (action && action in HUMIDIFIER_ACTION_MODE) {
      return action as HumidifierAction;
    }

    return "idle";
  }
}
