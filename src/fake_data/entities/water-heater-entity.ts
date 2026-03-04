import { MockBaseEntity, BASE_CAPABILITY_ATTRIBUTES } from "./base-entity";

export class MockWaterHeaterEntity extends MockBaseEntity {
  static CAPABILITY_ATTRIBUTES = new Set([
    ...BASE_CAPABILITY_ATTRIBUTES,
    "current_temperature",
    "min_temp",
    "max_temp",
    "operation_list",
  ]);

  public async handleService(
    domain: string,
    service: string,
    data: Record<string, any>
  ): Promise<void> {
    if (domain !== this.domain) {
      return;
    }

    if (service === "set_operation_mode") {
      this.update({ state: data.operation_mode });
      return;
    }
    if (["set_temperature"].includes(service)) {
      const { entity_id: _entityId, ...toSet } = data;
      this.update({ attributes: toSet });
      return;
    }
    super.handleService(domain, service, data);
  }
}
