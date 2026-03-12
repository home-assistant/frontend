import { MockBaseEntity } from "./base-entity";
import type { EntityAttributes } from "./types";

const TRANSITION_MS = 1000;

export class MockLockEntity extends MockBaseEntity {
  public async handleService(
    domain: string,
    service: string,
    data: Record<string, any>
  ): Promise<void> {
    if (domain !== this.domain) {
      return;
    }

    this._clearTransition();

    if (service === "lock") {
      this._transition("locking", "locked", TRANSITION_MS);
      return;
    }

    if (service === "unlock") {
      this._transition("unlocking", "unlocked", TRANSITION_MS);
      return;
    }

    if (service === "open") {
      this._transition("opening", "open", TRANSITION_MS, () => {
        this._transition("locking", "unlocked", TRANSITION_MS);
      });
      return;
    }

    super.handleService(domain, service, data);
  }

  protected _getCapabilityAttributes(): EntityAttributes {
    const attrs = this.attributes;
    const capabilityAttrs: EntityAttributes = {};

    if (attrs.code_format !== undefined) {
      capabilityAttrs.code_format = attrs.code_format;
    }

    return capabilityAttrs;
  }

  protected _getStateAttributes(): EntityAttributes {
    const attrs = this.attributes;

    return {
      changed_by: attrs.changed_by ?? null,
    };
  }
}
