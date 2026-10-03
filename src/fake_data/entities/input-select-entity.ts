import { MockBaseEntity } from "./base-entity";

export class MockInputSelectEntity extends MockBaseEntity {
  public async handleService(
    domain: string,
    service: string,
    data: Record<string, any>
  ): Promise<void> {
    if (domain !== this.domain) {
      return;
    }

    if (service === "select_option") {
      this.update({ state: String(data.option) });
      return;
    }
    super.handleService(domain, service, data);
  }
}
