import { MockBaseEntity } from "./base-entity";

export class MockInputNumberEntity extends MockBaseEntity {
  public async handleService(
    domain: string,
    service: string,
    data: Record<string, any>
  ): Promise<void> {
    if (domain !== this.domain) {
      return;
    }

    if (service === "set_value") {
      this.update({ state: String(data.value) });
      return;
    }
    super.handleService(domain, service, data);
  }
}
