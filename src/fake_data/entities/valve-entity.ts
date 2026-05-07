import { supportsFeatureFromAttributes } from "../../common/entity/supports-feature";
import { ValveEntityFeature } from "../../data/valve";
import { MockBaseEntity } from "./base-entity";
import type { EntityAttributes } from "./types";

export class MockValveEntity extends MockBaseEntity {
  public async handleService(
    domain: string,
    service: string,
    data: Record<string, any>
  ): Promise<void> {
    if (domain !== this.domain) {
      return;
    }

    if (service === "open_valve") {
      this.update({
        state: "open",
        attributes: { current_position: 100 },
      });
      return;
    }

    if (service === "close_valve") {
      this.update({
        state: "closed",
        attributes: { current_position: 0 },
      });
      return;
    }

    if (service === "toggle") {
      if (this.state === "open") {
        this.handleService(domain, "close_valve", data);
      } else {
        this.handleService(domain, "open_valve", data);
      }
      return;
    }

    if (service === "stop_valve") {
      return;
    }

    if (service === "set_valve_position") {
      this.update({
        state: data.position > 0 ? "open" : "closed",
        attributes: { current_position: data.position },
      });
      return;
    }

    super.handleService(domain, service, data);
  }

  protected _getStateAttributes(): EntityAttributes {
    const attrs = this.attributes;
    const stateAttrs: EntityAttributes = {};

    if (supportsFeatureFromAttributes(attrs, ValveEntityFeature.SET_POSITION)) {
      stateAttrs.current_position = attrs.current_position ?? null;
    }

    return stateAttrs;
  }
}
