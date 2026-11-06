import { MockToggleEntity } from "./toggle-entity";
import type { EntityAttributes } from "./types";

const AUTOMATION_ATTRIBUTES = [
  "id",
  "last_triggered",
  "mode",
  "current",
  "max",
];

export class MockAutomationEntity extends MockToggleEntity {
  public async handleService(
    domain: string,
    service: string,
    data: Record<string, any>
  ): Promise<void> {
    if (domain === "automation" && service === "trigger") {
      this.update({
        attributes: { last_triggered: new Date().toISOString() },
      });
      return;
    }
    super.handleService(domain, service, data);
  }

  protected _getStateAttributes(): EntityAttributes {
    const stateAttrs: EntityAttributes = {};
    for (const key of AUTOMATION_ATTRIBUTES) {
      if (key in this.attributes) {
        stateAttrs[key] = this.attributes[key];
      }
    }
    return stateAttrs;
  }
}
