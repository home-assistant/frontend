import { MockBaseEntity } from "./base-entity";

export class MockCoverEntity extends MockBaseEntity {
  public async handleService(
    domain: string,
    service: string,
    data: Record<string, any>
  ): Promise<void> {
    if (domain !== this.domain) {
      return;
    }

    if (service === "open_cover") {
      this.update({ state: "open" });
      return;
    }
    if (service === "close_cover") {
      this.update({ state: "closed" });
      return;
    }
    if (service === "set_cover_position") {
      this.update({
        state: data.position > 0 ? "open" : "closed",
        attributes: { current_position: data.position },
      });
      return;
    }
    super.handleService(domain, service, data);
  }
}
