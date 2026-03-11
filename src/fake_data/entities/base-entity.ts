import type { HassEntity } from "home-assistant-js-websocket";
import type { EntityAttributes, EntityInput, MockHassLike } from "./types";

const now = () => new Date().toISOString();
const randomTime = () =>
  new Date(new Date().getTime() - Math.random() * 80 * 60 * 1000).toISOString();

export const BASE_CAPABILITY_ATTRIBUTES = new Set([
  "friendly_name",
  "unit_of_measurement",
  "icon",
  "entity_picture",
  "supported_features",
  "hidden",
  "assumed_state",
  "device_class",
  "state_class",
  "restored",
]);

export class MockBaseEntity {
  public entityId: string;

  public domain: string;

  public objectId: string;

  public state: string;

  public baseAttributes: EntityAttributes;

  public attributes: EntityAttributes;

  public lastChanged: string;

  public lastUpdated: string;

  public hass?: MockHassLike;

  private _transitionTimer?: ReturnType<typeof setTimeout>;

  static CAPABILITY_ATTRIBUTES: Set<string> = BASE_CAPABILITY_ATTRIBUTES;

  constructor(input: EntityInput) {
    this.entityId = input.entity_id;
    const [domain, objectId] = input.entity_id.split(".", 2);
    this.domain = domain;
    this.objectId = objectId;
    this.state = input.state;
    this.lastChanged = randomTime();
    this.lastUpdated = randomTime();

    const attributes: EntityAttributes = input.attributes || {};

    // These are the attributes that we always write to the state machine
    const baseAttributes: Record<string, any> = {};
    const capabilityAttributes = (this.constructor as typeof MockBaseEntity)
      .CAPABILITY_ATTRIBUTES;
    for (const key of Object.keys(attributes)) {
      if (capabilityAttributes.has(key)) {
        baseAttributes[key] = attributes[key];
      }
    }

    this.baseAttributes = baseAttributes;
    this.attributes = attributes;
  }

  public async handleService(
    domain: string,
    service: string,
    data: Record<string, any>
  ): Promise<void> {
    // eslint-disable-next-line no-console
    console.log(
      `Unmocked service for ${this.entityId}: ${domain}/${service}`,
      data
    );
  }

  protected _transition(
    transitioning: string,
    final: string,
    duration: number,
    onComplete?: () => void
  ): void {
    this._clearTransition();
    this.update({ state: transitioning });
    this._transitionTimer = setTimeout(() => {
      this._transitionTimer = undefined;
      this.update({ state: final });
      onComplete?.();
    }, duration);
  }

  protected _clearTransition(): void {
    if (this._transitionTimer) {
      clearTimeout(this._transitionTimer);
      this._transitionTimer = undefined;
    }
  }

  public update(changes: {
    state?: string;
    attributes?: EntityAttributes;
  }): void {
    this.lastUpdated = now();
    if (changes.state !== undefined && changes.state !== this.state) {
      this.state = changes.state;
      this.lastChanged = this.lastUpdated;
    }
    if (changes.attributes) {
      this.attributes = { ...this.attributes, ...changes.attributes };
    }

    this.hass!.updateStates({
      [this.entityId]: this.toState(),
    });
  }

  protected _getBaseAttributes(): EntityAttributes {
    const attrs = this.attributes;
    const baseAttrs: EntityAttributes = {};
    for (const key of [
      "friendly_name",
      "icon",
      "entity_picture",
      "assumed_state",
      "device_class",
      "supported_features",
    ]) {
      if (key in attrs) {
        baseAttrs[key] = attrs[key];
      }
    }
    return baseAttrs;
  }

  protected _getCapabilityAttributes(): EntityAttributes {
    return {};
  }

  protected _getStateAttributes(): EntityAttributes {
    return {};
  }

  public toState(): HassEntity {
    return {
      entity_id: this.entityId,
      state: this.state,
      attributes: {
        ...this._getBaseAttributes(),
        ...this._getCapabilityAttributes(),
        ...this._getStateAttributes(),
      },
      last_changed: this.lastChanged,
      last_updated: this.lastUpdated,
      context: { id: this.entityId, user_id: null, parent_id: null },
    };
  }
}
