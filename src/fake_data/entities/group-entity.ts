import { MockBaseEntity } from "./base-entity";

export class MockGroupEntity extends MockBaseEntity {
  public async handleService(
    domain: string,
    service: string,
    data: Record<string, any>
  ): Promise<void> {
    if (!["homeassistant", this.domain].includes(domain)) {
      return;
    }

    await Promise.all(
      this.attributes.entity_id.map((ent: string) => {
        const entity = this.hass!.mockEntities[ent];
        return entity.handleService(entity.domain, service, data);
      })
    );

    this.update({ state: service === "turn_on" ? "on" : "off" });
  }
}
