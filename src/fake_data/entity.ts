import { HassEntityAttributeBase } from "home-assistant-js-websocket";

/* tslint:disable:max-classes-per-file */

const now = () => new Date().toISOString();
const randomTime = () =>
  new Date(new Date().getTime() - Math.random() * 80 * 60 * 1000).toISOString();

export class Entity {
  public domain: string;
  public objectId: string;
  public entityId: string;
  public lastChanged: string;
  public lastUpdated: string;
  public state: string;
  public baseAttributes: HassEntityAttributeBase & { [key: string]: any };
  public attributes: HassEntityAttributeBase & { [key: string]: any };
  public hass?: any;

  constructor(domain, objectId, state, baseAttributes) {
    this.domain = domain;
    this.objectId = objectId;
    this.entityId = `${domain}.${objectId}`;
    this.lastChanged = randomTime();
    this.lastUpdated = randomTime();
    this.state = String(state);
    // These are the attributes that we always write to the state machine
    this.baseAttributes = baseAttributes;
    this.attributes = baseAttributes;
  }

  public async handleService(domain, service, data: { [key: string]: any }) {
    // tslint:disable-next-line
    console.log(
      `Unmocked service for ${this.entityId}: ${domain}/${service}`,
      data
    );
  }

  public update(state, attributes = {}) {
    this.state = state;
    this.lastUpdated = now();
    this.lastChanged =
      state === this.state ? this.lastChanged : this.lastUpdated;
    this.attributes = { ...this.baseAttributes, ...attributes };

    // tslint:disable-next-line
    console.log("update", this.entityId, this);

    this.hass.updateStates({
      [this.entityId]: this.toState(),
    });
  }

  public toState() {
    return {
      entity_id: this.entityId,
      state: this.state,
      attributes: this.attributes,
      last_changed: this.lastChanged,
      last_updated: this.lastUpdated,
    };
  }
}

export class LightEntity extends Entity {
  public async handleService(domain, service, data) {
    if (!["homeassistant", this.domain].includes(domain)) {
      return;
    }

    if (service === "turn_on") {
      // tslint:disable-next-line
      let { brightness, hs_color, brightness_pct } = data;
      brightness = (255 * brightness_pct) / 100;
      this.update("on", { ...this.attributes, brightness, hs_color });
    } else if (service === "turn_off") {
      this.update("off");
    } else if (service === "toggle") {
      if (this.state === "on") {
        this.handleService(domain, "turn_off", data);
      } else {
        this.handleService(domain, "turn_on", data);
      }
    }
  }
}

export class LockEntity extends Entity {
  public async handleService(
    domain,
    service,
    // @ts-ignore
    data
  ) {
    if (domain !== this.domain) {
      return;
    }

    if (service === "lock") {
      this.update("locked");
    } else if (service === "unlock") {
      this.update("unlocked");
    }
  }
}

export class CoverEntity extends Entity {
  public async handleService(
    domain,
    service,
    // @ts-ignore
    data
  ) {
    if (domain !== this.domain) {
      return;
    }

    if (service === "open_cover") {
      this.update("open");
    } else if (service === "close_cover") {
      this.update("closing");
    }
  }
}

export class ClimateEntity extends Entity {
  public async handleService(domain, service, data) {
    if (domain !== this.domain) {
      return;
    }

    if (service === "set_operation_mode") {
      this.update(
        data.operation_mode === "heat" ? "heat" : data.operation_mode,
        { ...this.attributes, operation_mode: data.operation_mode }
      );
    }
  }
}

export class GroupEntity extends Entity {
  public async handleService(domain, service, data) {
    if (!["homeassistant", this.domain].includes(domain)) {
      return;
    }

    await Promise.all(
      this.attributes.entity_id.map((ent) => {
        const entity = this.hass.mockEntities[ent];
        return entity.handleService(entity.domain, service, data);
      })
    );

    this.update(service === "turn_on" ? "on" : "off");
  }
}

const TYPES = {
  climate: ClimateEntity,
  light: LightEntity,
  lock: LockEntity,
  cover: CoverEntity,
  group: GroupEntity,
};

export const getEntity = (domain, objectId, state, baseAttributes = {}) =>
  new (TYPES[domain] || Entity)(domain, objectId, state, baseAttributes);
