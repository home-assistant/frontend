import { MockBaseEntity } from "./base-entity";

/**
 * Generic toggle entity used for domains: automation, input_boolean, switch.
 * Handles turn_on, turn_off, and toggle services via homeassistant or own domain.
 */
export class MockToggleEntity extends MockBaseEntity {
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
    super.handleService(domain, service, data);
  }
}
