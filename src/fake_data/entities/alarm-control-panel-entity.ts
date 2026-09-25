import { MockBaseEntity } from "./base-entity";
import type { EntityAttributes } from "./types";

const TRANSITION_MS = 1000;

const SERVICE_TO_STATE: Record<string, string> = {
  alarm_arm_home: "armed_home",
  alarm_arm_away: "armed_away",
  alarm_arm_night: "armed_night",
  alarm_arm_vacation: "armed_vacation",
  alarm_arm_custom_bypass: "armed_custom_bypass",
};

export class MockAlarmControlPanelEntity extends MockBaseEntity {
  public async handleService(
    domain: string,
    service: string,
    data: Record<string, any>
  ): Promise<void> {
    if (domain !== this.domain) {
      return;
    }

    this._clearTransition();

    if (service in SERVICE_TO_STATE) {
      this._transition("arming", SERVICE_TO_STATE[service], TRANSITION_MS);
      return;
    }

    if (service === "alarm_disarm") {
      this.update({ state: "disarmed" });
      return;
    }

    if (service === "alarm_trigger") {
      this._transition("pending", "triggered", TRANSITION_MS);
      return;
    }

    super.handleService(domain, service, data);
  }

  protected _getCapabilityAttributes(): EntityAttributes {
    const attrs = this.attributes;
    const capabilityAttrs: EntityAttributes = {};

    if (attrs.code_format !== undefined) {
      capabilityAttrs.code_format = attrs.code_format;
    }
    if (attrs.code_arm_required !== undefined) {
      capabilityAttrs.code_arm_required = attrs.code_arm_required;
    }

    return capabilityAttrs;
  }

  protected _getStateAttributes(): EntityAttributes {
    const attrs = this.attributes;

    return {
      changed_by: attrs.changed_by ?? null,
    };
  }
}
