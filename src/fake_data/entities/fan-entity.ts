import { MockBaseEntity, BASE_CAPABILITY_ATTRIBUTES } from "./base-entity";

export class MockFanEntity extends MockBaseEntity {
  static CAPABILITY_ATTRIBUTES = new Set([
    ...BASE_CAPABILITY_ATTRIBUTES,
    "direction",
    "oscillating",
    "percentage",
  ]);

  public async handleService(
    domain: string,
    service: string,
    data: Record<string, any>
  ): Promise<void> {
    if (domain !== this.domain) {
      return;
    }

    if (["turn_on", "turn_off"].includes(service)) {
      this.update({ state: service === "turn_on" ? "on" : "off" });
      return;
    }
    if (["set_direction", "oscillate", "set_percentage"].includes(service)) {
      const { entity_id: _entityId, ...toSet } = data;
      this.update({ attributes: toSet });
      return;
    }
    super.handleService(domain, service, data);
  }
}
