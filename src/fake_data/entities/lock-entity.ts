import { MockBaseEntity } from "./base-entity";

export class MockLockEntity extends MockBaseEntity {
  public async handleService(
    domain: string,
    service: string,
    data: Record<string, any>
  ): Promise<void> {
    if (domain !== this.domain) {
      return;
    }

    if (service === "lock") {
      this.update({ state: "locked" });
      return;
    }
    if (service === "unlock") {
      this.update({ state: "unlocked" });
      return;
    }
    super.handleService(domain, service, data);
  }
}
