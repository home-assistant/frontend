import { MockBaseEntity } from "./base-entity";

const TRANSITION_MS = 3000;

export class MockLawnMowerEntity extends MockBaseEntity {
  public async handleService(
    domain: string,
    service: string,
    _data: Record<string, any>
  ): Promise<void> {
    if (domain !== this.domain) {
      return;
    }

    this._clearTransition();

    if (service === "start_mowing") {
      this.update({ state: "mowing" });
      return;
    }

    if (service === "pause") {
      this.update({ state: "paused" });
      return;
    }

    if (service === "dock") {
      this._transition("returning", "docked", TRANSITION_MS);
      return;
    }

    super.handleService(domain, service, _data);
  }
}
